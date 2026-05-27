import { supabase } from '@/lib/supabase';
import { getLocalConversations, getLocalBlocks, syncLocalBlocks, getLocalStatuses, pruneExpiredStatuses, saveLocalStatus, syncLocalStatuses, saveLocalProfile, saveLocalConversation } from '@/lib/localDb';
import { decryptText, getChatKey } from '@/utils/chatCrypto';

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

    // 2. Fetch Blocked Users & Friendships
    const [blockedRes, friendshipsSent] = await Promise.all([
        supabase.from('blocked_users').select('blocked_id').eq('blocker_id', userId),
        supabase.from('friendships').select(`is_favorite, is_archived, is_locked, friend_id, friend:profiles!friendships_friend_id_fkey(id, username, email, phone, avatar_url, is_online, show_email, show_phone)`).eq('user_id', userId)
    ]);

    const blockedIds = blockedRes.data?.map(b => b.blocked_id) || localBlocked;
    if (db && blockedRes.data) {
        await syncLocalBlocks(db, userId, blockedIds);
    }

    const friendships = (friendshipsSent.data || []).map(f => ({ ...f, type: 'sent' }));
    const friendIds = friendships.map(f => f.friend_id);
    const allRelevantIds = [userId, ...friendIds];

    // 3. Statuses and other items
    if (db) {
        await getLocalStatuses(db);
        await pruneExpiredStatuses(db);
    }

    const nowIso = new Date().toISOString();
    const statusQuery = supabase.from('statuses')
        .select('id, user_id, content, media_type, media_url, thumbnail_url, background_color, expires_at, created_at, is_deleted, privacy_type, viewer_ids')
        .in('user_id', allRelevantIds)
        .gt('expires_at', nowIso)
        .eq('is_deleted', false);
    
    const [groupRes, statusRes, viewsRes, unreadRes, recentMsgsRes] = await Promise.all([
        supabase.from('group_members').select('group_id, groups (id, name, avatar_url)').eq('user_id', userId),
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
    const keyCache: Record<string, any> = {};
    
    await Promise.all(uniqueStatusUsers.map(async (uid) => {
        try { keyCache[uid] = await getChatKey(uid, uid); } catch (e) { console.error('Failed to pre-fetch key for', uid, e); }
    }));

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
        const { data } = await supabase.from('profiles').select('id, username, email, phone, avatar_url, is_online, show_email, show_phone').in('id', missingUserIds);
        if (data) missingProfiles = data;
    }

    // Format Friends
    const allProfilesToFormat = [
        ...friendships.map((f: any) => ({ otherProfile: f.friend, f, isFriend: true })),
        ...missingProfiles.map(p => ({ otherProfile: p, f: {}, isFriend: false }))
    ];

    const formattedFriends = allProfilesToFormat.map(({ otherProfile, f, isFriend }: any) => {
        if (!otherProfile) return null;
        const sInfo = statusInfoMap[otherProfile.id] || { count: 0, viewedCount: 0 };
        const existingItem = localConv.find(i => i.id === otherProfile.id);
        const isLocked = (f.is_locked === true) || (existingItem?.isLocked === true);
        const isFavorite = (f.is_favorite === true) || (existingItem?.isFavorite === true);
        const isArchived = (f.is_archived === true) || (existingItem?.isArchived === true);

        return {
            id: otherProfile.id,
            name: otherProfile.username || 'Unknown',
            email: otherProfile.show_email !== false ? otherProfile.email : null,
            phone: otherProfile.show_phone ? otherProfile.phone : null,
            img: otherProfile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(otherProfile.username || 'User')}&backgroundColor=F68537`,
            unreadCount: unreadCountsMap[otherProfile.id] || 0,
            statusCount: sInfo.count,
            allStatusesViewed: sInfo.count > 0 && sInfo.count === sInfo.viewedCount,
            db_is_online: otherProfile.is_online,
            lastActivity: lastActivityMap[otherProfile.id] || '0',
            isGroup: false,
            isFriend: isFriend,
            isUnfriended: !isFriend,
            isFavorite: !!isFavorite,
            isArchived: !!isArchived,
            isBlocked: blockedIds.includes(otherProfile.id),
            isLocked: !!isLocked
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
            lastActivity: lastActivityMap[m.groups.id] || '0',
            statusCount: 0
        };
    });

    // My Statuses
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: myAllStatuses } = await supabase.from('statuses').select('*').eq('user_id', userId).gt('created_at', sevenDaysAgo.toISOString()).order('created_at', { ascending: false });

    const decryptedMyStatuses = await Promise.all((myAllStatuses || []).map(async (s) => {
        let decryptedContent = s.content;
        let decryptedMediaUrl = s.media_url;

        if (s.content && s.content.trim().startsWith('{')) {
            try {
                const statusKey = await getChatKey(userId, userId);
                decryptedContent = await decryptText(s.content, statusKey);
            } catch (e) { console.error('My status content decryption error:', e); }
        }
        if (s.media_url && s.media_url.trim().startsWith('{')) {
            try {
                const statusKey = await getChatKey(userId, userId);
                decryptedMediaUrl = await decryptText(s.media_url, statusKey);
            } catch (e) { console.error('My status media decryption error:', e); }
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
        // Save the valid ones (excluding self)
        sortedItems.forEach(item => {
            if (item.id !== userId) {
                saveLocalConversation(db, item);
            }
        });
        
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
