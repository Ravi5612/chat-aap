import { supabase } from '@/lib/supabase';
import { getLocalConversations, getLocalBlocks, syncLocalBlocks, getLocalStatuses, pruneExpiredStatuses, saveLocalStatus, syncLocalStatuses, saveLocalProfile, saveLocalConversation } from '@/lib/localDb';
import { decryptText, getChatKey, decryptKeyWithSharedSecret } from '@/utils/chatCrypto';
import { getVisibleAvatar } from '@/utils/privacyHelper';

export async function fetchAndFormatFriendsData(
    userId: string,
    existingItems: any[],
    db: any,
    onlineUsers: Record<string, any>,
    currentUserId: string | undefined
) {
    let localConv = existingItems;
    let localBlocked: string[] = [];

    // 1. Local Load First
    if (db && existingItems.length === 0) {
        const [lc, lb] = await Promise.all([
            getLocalConversations(db),
            getLocalBlocks(db, userId)
        ]);
        if (lc && lc.length > 0) localConv = lc;
        if (lb && lb.length > 0) localBlocked = lb;
    }

    // 2. Fetch Blocked Users & Friendships (Without fragile foreign key joins)
    const [blockedRes, friendshipsRes] = await Promise.all([
        supabase.from('blocked_users').select('blocked_id').eq('blocker_id', userId),
        supabase.from('friendships').select('is_favorite, is_archived, is_locked, is_hidden, disappearing_duration, user_id, friend_id').or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    ]);
    if (friendshipsRes.error) console.error('[DEBUG] friendships error:', friendshipsRes.error);

    const blockedIds = blockedRes.data?.map(b => b.blocked_id) || localBlocked;
    if (db && blockedRes.data) {
        await syncLocalBlocks(db, userId, blockedIds);
    }

    const friendshipsData = friendshipsRes.data || [];
    console.log('[DEBUG] friendshipsData:', friendshipsData);
    
    const friendIdsMap = new Map();
    
    // Deduplicate and prioritize current user's preferences
    friendshipsData.forEach((f: any) => {
        if (f.user_id === userId) {
            friendIdsMap.set(f.friend_id, f);
        } else if (f.friend_id === userId && !friendIdsMap.has(f.user_id)) {
            friendIdsMap.set(f.user_id, f);
        }
    });

    const friendIds = Array.from(friendIdsMap.keys());
    console.log('[DEBUG] friendIds:', friendIds);
    let friendships: any[] = [];
    
    if (friendIds.length > 0) {
        const { data: friendProfiles, error: fpError } = await supabase
            .from('profiles')
            .select('id, username, email, phone, avatar_url, gender, is_online, show_email, show_phone, allow_screenshot, allow_status_download, dp_privacy, dp_selected_friends, hide_dp_in_search, public_key')
            .in('id', friendIds);
            
        console.log('[DEBUG] friendProfiles:', friendProfiles, fpError);
            
        if (friendProfiles) {
            friendships = friendProfiles.map(p => {
                const f = friendIdsMap.get(p.id);
                return { ...f, friend: p };
            });
        }
    }

    const allRelevantIds = [userId, ...friendIds];

    // 3. Statuses and other items
    if (db) {
        await getLocalStatuses(db);
        await pruneExpiredStatuses(db);
    }

    const nowIso = new Date().toISOString();
    const statusQuery = supabase.from('statuses')
        .select('id, user_id, content, media_type, media_url, thumbnail_url, background_color, expires_at, created_at, is_deleted, privacy_type, viewer_ids, encrypted_keys')
        .in('user_id', allRelevantIds)
        .gt('expires_at', nowIso)
        .eq('is_deleted', false);
    
    const [groupRes, statusRes, viewsRes, unreadRes, recentMsgsRes] = await Promise.all([
        supabase.from('group_members').select('group_id, is_hidden, groups (id, name, avatar_url)').eq('user_id', userId),
        statusQuery,
        supabase.from('status_views').select('status_id').eq('viewer_id', userId),
        supabase.from('messages').select('sender_id, group_id').or(`receiver_id.eq.${userId}, group_id.not.is.null`).eq('is_read', false),
        supabase.from('messages').select('created_at, sender_id, receiver_id, group_id').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: false }).limit(200)
    ]);

    let filteredStatuses = statusRes.data || [];
    if (filteredStatuses.length > 0) {
        filteredStatuses = filteredStatuses.filter(s => {
            if (s.user_id === userId) return true;
            if (s.privacy_type === 'all' || !s.privacy_type) return true;
            if (s.privacy_type === 'selected' && s.viewer_ids?.includes(userId)) return true;
            return false;
        });
    }

    if (groupRes.error) throw groupRes.error;

    // Process Status Info
    const viewedStatusIds = new Set(viewsRes.data?.map(v => v.status_id) || []);
    const statusInfoMap: Record<string, { count: number, viewedCount: number, thumbnail?: string, mediaType?: string, text?: string, bgColor?: string }> = {};

    const sortedStatuses = [...filteredStatuses].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const uniqueStatusUsers = [...new Set(sortedStatuses.map(s => s.user_id))];
    // Build a map of friend's public keys
    const friendPublicKeys: Record<string, string> = {};
    friendships.forEach((f: any) => {
        if (f.friend?.public_key) friendPublicKeys[f.friend.id] = f.friend.public_key;
    });

    // Also get current user's profile for my own statuses
    const { data: myProfile } = await supabase.from('profiles').select('public_key').eq('id', userId).single();
    if (myProfile?.public_key) {
        friendPublicKeys[userId] = myProfile.public_key;
    }

    // Attempt to extract statusKey from the first found status for each user
    const keyCache: Record<string, Uint8Array> = {};
    for (const uid of uniqueStatusUsers) {
        // Find the most recent status of this user
        const latestStatus = sortedStatuses.find(s => s.user_id === uid);
        if (latestStatus && latestStatus.encrypted_keys && latestStatus.encrypted_keys[userId]) {
            const creatorPublicKey = friendPublicKeys[uid];
            if (creatorPublicKey) {
                try {
                    const statusKey = await decryptKeyWithSharedSecret(latestStatus.encrypted_keys[userId], creatorPublicKey, userId);
                    if (statusKey) {
                        keyCache[uid] = statusKey;
                    }
                } catch (e) {
                    console.error('Failed to decrypt status master key for', uid, e);
                }
            }
        }
        
        // Fallback for old deterministic statuses
        if (!keyCache[uid]) {
            try { keyCache[uid] = await getChatKey(uid, uid); } catch (e) { console.error('Failed to pre-fetch key for', uid, e); }
        }
    }

    for (const s of sortedStatuses) {
        if (!statusInfoMap[s.user_id]) {
            statusInfoMap[s.user_id] = { count: 0, viewedCount: 0 };
            if (s.thumbnail_url || s.media_url) {
                const targetUrl = s.thumbnail_url || s.media_url;
                if (targetUrl.trim().startsWith('{')) {
                    try {
                        const statusKey = keyCache[s.user_id];
                        if (statusKey) {
                            statusInfoMap[s.user_id].thumbnail = await decryptText(targetUrl, statusKey);
                            statusInfoMap[s.user_id].mediaType = s.media_type;
                        }
                    } catch (e) { console.error('Thumbnail decryption error:', e); }
                } else {
                    statusInfoMap[s.user_id].thumbnail = targetUrl;
                    statusInfoMap[s.user_id].mediaType = s.media_type;
                }
            } else if (s.media_type === 'text') {
                statusInfoMap[s.user_id].mediaType = 'text';
                statusInfoMap[s.user_id].bgColor = s.background_color;
                if (s.content && s.content.trim().startsWith('{')) {
                    try {
                        const statusKey = keyCache[s.user_id];
                        if (statusKey) {
                            statusInfoMap[s.user_id].text = await decryptText(s.content, statusKey);
                        }
                    } catch (e) { console.error('Text status decryption error:', e); }
                } else {
                    statusInfoMap[s.user_id].text = s.content;
                }
            }
        }
        statusInfoMap[s.user_id].count++;
        if (viewedStatusIds.has(s.id)) statusInfoMap[s.user_id].viewedCount++;
    }

    if (db && filteredStatuses) {
        const fetchedStatusIds = filteredStatuses.map(s => s.id);
        filteredStatuses.forEach(s => saveLocalStatus(db, s));
        await syncLocalStatuses(db, fetchedStatusIds, userId);
    }

    // Process Unread Counts
    const userGroupIds = new Set(groupRes.data?.map(m => m.group_id) || []);
    const unreadCountsMap: any = {};
    (unreadRes.data || []).forEach(m => {
        if (m.group_id) {
            if (userGroupIds.has(m.group_id)) unreadCountsMap[m.group_id] = (unreadCountsMap[m.group_id] || 0) + 1;
        } else {
            unreadCountsMap[m.sender_id] = (unreadCountsMap[m.sender_id] || 0) + 1;
        }
    });

    // Process Last Activity
    const lastActivityMap: Record<string, string> = {};
    const recentChatUserIds = new Set<string>();
    (recentMsgsRes.data || []).forEach(m => {
        const chatId = m.group_id || (m.sender_id === userId ? m.receiver_id : m.sender_id);
        if (chatId) {
            if (!lastActivityMap[chatId]) lastActivityMap[chatId] = m.created_at;
            if (!m.group_id) recentChatUserIds.add(chatId);
        }
    });

    // Find missing profiles
    const missingUserIds = Array.from(recentChatUserIds).filter(id => !friendIds.includes(id) && id !== userId);
    let missingProfiles: any[] = [];
    if (missingUserIds.length > 0) {
        const { data } = await supabase.from('profiles').select('id, username, email, phone, avatar_url, gender, is_online, show_email, show_phone, allow_screenshot, allow_status_download, dp_privacy, dp_selected_friends, hide_dp_in_search').in('id', missingUserIds);
        if (data) missingProfiles = data;
    }

    // Format Friends
    const allProfilesToFormat = [
        ...friendships.map((f: any) => ({ otherProfile: f.friend, f, isFriend: true })),
        ...missingProfiles.map(p => ({ otherProfile: p, f: {}, isFriend: false, isFormerChat: true }))
    ];

    const { getVisibleAvatar } = require('@/utils/privacyHelper');

    const formattedFriends = allProfilesToFormat.map(({ otherProfile, f, isFriend, isFormerChat }: any) => {
        if (!otherProfile) return null;
        const sInfo = statusInfoMap[otherProfile.id] || { count: 0, viewedCount: 0 };
        const existingItem = localConv.find(i => i.id === otherProfile.id);
        const isLocked = (f.is_locked === true) || (existingItem?.isLocked === true);
        const isFavorite = (f.is_favorite === true) || (existingItem?.isFavorite === true);
        const isArchived = (f.is_archived === true) || (existingItem?.isArchived === true);
        const isHidden = (f.is_hidden === true) || (existingItem?.isHidden === true);

        // isFormerChat = these people had a chat history but are NOT in friendships table.
        // They should NOT be marked as Unfriended - they may still be friends (data sync issue).
        // Only mark isUnfriended = true when explicitly NOT a friend AND NOT a former chat partner.
        const isUnfriended = !isFriend && !isFormerChat;

        return {
            id: otherProfile.id,
            name: otherProfile.username || 'Unknown',
            email: otherProfile.show_email !== false ? otherProfile.email : null,
            phone: otherProfile.show_phone ? otherProfile.phone : null,
            img: getVisibleAvatar(otherProfile, userId, isFriend, false),
            gender: otherProfile?.gender,
            unreadCount: unreadCountsMap[otherProfile.id] || 0,
            statusCount: sInfo.count,
            allStatusesViewed: sInfo.count > 0 && sInfo.count === sInfo.viewedCount,
            db_is_online: otherProfile.is_online,
            lastActivity: lastActivityMap[otherProfile.id] || '0',
            isGroup: false,
            isFriend: isFriend,
            isUnfriended: isUnfriended,
            isFavorite: !!isFavorite,
            isArchived: !!isArchived,
            isBlocked: blockedIds.includes(otherProfile.id),
            isLocked: !!isLocked,
            isHidden: !!isHidden,
            disappearing_duration: f.disappearing_duration || 0,
            friend: {
                allow_screenshot: otherProfile.allow_screenshot,
                allow_status_download: otherProfile.allow_status_download
            }
        };
    }).filter(Boolean);

    if (db) {
        friendships.forEach((f: any) => {
            if (f.friend) saveLocalProfile(db, f.friend);
        });
    }

    // Format Groups
    const formattedGroups = (groupRes.data || []).filter(m => m.groups).map((m: any) => {
        const existingItem = localConv.find(i => i.id === m.groups.id);
        return {
            id: m.groups.id,
            name: m.groups.name,
            img: m.groups.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.groups.name)}&backgroundColor=F68537`,
            unreadCount: unreadCountsMap[m.groups.id] || 0,
            isGroup: true,
            isFavorite: existingItem?.isFavorite || false,
            isArchived: existingItem?.isArchived || false,
            isLocked: existingItem?.isLocked || false,
            isHidden: m.is_hidden === true || existingItem?.isHidden === true,
            disappearing_duration: m.groups.disappearing_duration || 0,
            lastActivity: lastActivityMap[m.groups.id] || '0',
            statusCount: 0
        };
    });

    // My Statuses
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: myAllStatuses } = await supabase.from('statuses').select('*').eq('user_id', userId).gt('created_at', sevenDaysAgo.toISOString()).order('created_at', { ascending: false });

    // myProfile is already fetched above!

    const decryptedMyStatuses = await Promise.all((myAllStatuses || []).map(async (s) => {
        let decryptedContent = s.content;
        let decryptedMediaUrl = s.media_url;

        let statusKey = null;
        if (s.encrypted_keys && s.encrypted_keys[userId] && myProfile?.public_key) {
            statusKey = await decryptKeyWithSharedSecret(s.encrypted_keys[userId], myProfile.public_key, userId);
        }
        if (!statusKey) {
            statusKey = await getChatKey(userId, userId);
        }

        if (statusKey) {
            if (s.content && s.content.trim().startsWith('{')) {
                try {
                    decryptedContent = await decryptText(s.content, statusKey);
                } catch (e) { console.error('My status content decryption error:', e); }
            }
            if (s.media_url && s.media_url.trim().startsWith('{')) {
                try {
                    decryptedMediaUrl = await decryptText(s.media_url, statusKey);
                } catch (e) { console.error('My status media decryption error:', e); }
            }
        }

        return { ...s, content: decryptedContent, media_url: decryptedMediaUrl };
    }));

    const groupedMyStatus: any = { active: [] };
    const now = new Date();
    decryptedMyStatuses.forEach(status => {
        const expiresAt = new Date(status.expires_at);
        if (expiresAt > now && !status.is_deleted) {
            groupedMyStatus.active.push(status);
        } else {
            const sDate = new Date(status.created_at);
            const diffDays = Math.floor((now.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));
            let dateKey = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : sDate.toLocaleDateString('en-US', { weekday: 'long' });
            if (!groupedMyStatus[dateKey]) groupedMyStatus[dateKey] = [];
            groupedMyStatus[dateKey].push(status);
        }
    });

    const isConnected = currentUserId ? !!onlineUsers[currentUserId] : false;

    const combined = [...formattedFriends.map(f => {
        const isOnline = isConnected ? !!onlineUsers[f!.id] : f!.db_is_online === true;
        return { 
            ...f, 
            isOnline,
            isTyping: onlineUsers[f!.id]?.typingTo === currentUserId
        };
    }), ...formattedGroups];
    
    const sortedItems = Array.from(new Map(combined.map(item => [item.id, item])).values())
        .sort((a, b) => {
            const tA = new Date(a.lastActivity || 0).getTime() || 0;
            const tB = new Date(b.lastActivity || 0).getTime() || 0;
            return tB - tA;
        });

    if (db) {
        // Save the valid ones (excluding self) sequentially to avoid SQLite locks
        for (const item of sortedItems) {
            if (item.id !== userId) {
                await saveLocalConversation(db, item);
            }
        }
        
        // Ensure current user is never in the local conversations table
        try {
            await db.runAsync('DELETE FROM conversations WHERE id = ?', [userId]);
        } catch (e) {
            console.error('Failed to delete self from conversations', e);
        }
    }

    return {
        friends: formattedFriends,
        groups: formattedGroups,
        myStatuses: groupedMyStatus,
        statusInfo: statusInfoMap,
        combinedItems: sortedItems,
        lockedChatIds: sortedItems.filter(i => i.isLocked).map(i => i.id),
        blockedIds,
        localConv
    };
}
