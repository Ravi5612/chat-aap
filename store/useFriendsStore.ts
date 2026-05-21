import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useDbStore } from './useDbStore';
import { saveLocalStatus, getLocalStatuses, pruneExpiredStatuses, syncLocalStatuses, saveLocalConversation, getLocalConversations, saveLocalProfile, getLocalBlocks, syncLocalBlocks, saveLocalBlock, deleteLocalBlock } from '@/lib/localDb';

interface FriendsState {
    friends: any[];
    groups: any[];
    combinedItems: any[];
    myStatuses: any;
    statusInfo: Record<string, { count: number, viewedCount: number, thumbnail?: string, mediaType?: string }>;
    onlineUsers: Record<string, any>;
    globalChannel: any | null;
    blockedUserIds: string[];
    lockedChatIds: string[];
    loading: boolean;
    error: string | null;
    setOnlineUsers: (users: Record<string, any>) => void;
    loadFriends: (userId: string, force?: boolean) => Promise<void>;
    fetchBlockedUsers: (userId: string) => Promise<void>;
    blockUser: (currentUserId: string, targetId: string) => Promise<void>;
    unblockUser: (currentUserId: string, targetId: string) => Promise<void>;
    lockChat: (chatId: string) => Promise<void>;
    unlockChat: (chatId: string) => Promise<void>;
    isChatLocked: (chatId: string) => boolean;
    leaveGroup: (userId: string, groupId: string) => Promise<boolean>;
    fetchGroupMembers: (groupId: string) => Promise<any[]>;
    addGroupMember: (groupId: string, userId: string, addedBy: string) => Promise<boolean>;
    removeGroupMember: (groupId: string, userId: string, removedBy: string) => Promise<boolean>;
    makeGroupAdmin: (groupId: string, userId: string, requestedBy: string) => Promise<boolean>;
    reset: () => void;
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
    friends: [],
    groups: [],
    combinedItems: [],
    myStatuses: { active: [] },
    statusInfo: {},
    onlineUsers: {},
    globalChannel: null,
    blockedUserIds: [],
    lockedChatIds: [],
    loading: false,
    error: null,


    setOnlineUsers: (onlineUsers) => {
        set({ onlineUsers });
        const { friends, groups } = get();
        if (friends.length === 0 && groups.length === 0) return;

        const currentUserId = (require('./useAuthStore').useAuthStore.getState()).user?.id;
        const isConnected = currentUserId ? !!onlineUsers[currentUserId] : false;

        const friendsWithPresence = friends.map(f => {
            const isOnline = isConnected ? !!onlineUsers[f.id] : f.db_is_online === true;
            return {
                ...f,
                isOnline,
                isTyping: onlineUsers[f.id]?.typingTo === currentUserId
            };
        });

        const combined = [...friendsWithPresence, ...groups];
        const uniqueItems = Array.from(new Map(combined.map(item => [item.id, item])).values())
            .sort((a, b) => {
                const parseDate = (d: any) => {
                    if (!d || d === '0') return 0;
                    const t = new Date(d).getTime();
                    return isNaN(t) ? 0 : t;
                };
                return parseDate(b.lastActivity) - parseDate(a.lastActivity);
            });

        set({ combinedItems: uniqueItems });
    },

    loadFriends: async (userId, force = false) => {
        if (!userId || userId === 'null') return;
        
        const { combinedItems: existingItems } = get();
        const { db } = useDbStore.getState();

        // 1. SILENT LOCAL LOAD FIRST (No skeleton trigger)
        if (db && existingItems.length === 0) {
            const [localConv, localBlocked] = await Promise.all([
                getLocalConversations(db),
                getLocalBlocks(db, userId)
            ]);

            if (localConv && localConv.length > 0) {
                console.log(`FriendsStore: Instant load of ${localConv.length} chats from Local DB`);
                set({ 
                    combinedItems: localConv,
                    lockedChatIds: localConv.filter(c => c.isLocked).map(c => c.id),
                    loading: false 
                });
            }

            if (localBlocked && localBlocked.length > 0) {
                set({ blockedUserIds: localBlocked });
            }
        }

        // 2. Determine if we REALLY need a skeleton
        // Only show loading if we have NO items yet AND it's not a background sync
        const currentItems = get().combinedItems;
        const shouldShowLoading = (currentItems.length === 0 || force);
        
        set({ loading: shouldShowLoading, error: null });



        try {
            // 1. Fetch Blocked Users & Friendships in parallel
            const [blockedRes, friendshipsSent] = await Promise.all([
                supabase.from('blocked_users').select('blocked_id').eq('blocker_id', userId),
                supabase.from('friendships').select(`is_favorite, is_archived, is_locked, friend_id, friend:profiles!friendships_friend_id_fkey(id, username, email, avatar_url, is_online)`).eq('user_id', userId)
            ]);

            const blockedIds = blockedRes.data?.map(b => b.blocked_id) || [];
            set({ blockedUserIds: blockedIds });
            
            // Sync Blocked Users to Local DB
            if (db) {
                await syncLocalBlocks(db, userId, blockedIds);
            }

            const friendships = (friendshipsSent.data || []).map(f => ({ ...f, type: 'sent' }));



            const friendIds = friendships.map(f => f.type === 'sent' ? f.friend_id : f.user_id);
            const allRelevantIds = [userId, ...friendIds];

            // 2. Fetch Groups, Statuses (respecting privacy), and Unread Counts in parallel
            const nowIso = new Date().toISOString();
            
            // 1. Try loading from Local DB first
            if (db) {
                const localStatuses = await getLocalStatuses(db);
                if (localStatuses.length > 0) {
                    console.log(`FriendsStore: Loaded ${localStatuses.length} statuses from Local DB`);
                }
                await pruneExpiredStatuses(db);
            }

            // Privacy Query Logic:
            // 1. My own statuses (always)
            // 2. Statuses shared with "all" (if friend)
            // 3. Statuses shared specifically with me ("selected" and userId is in viewer_ids)
            const statusQuery = supabase.from('statuses')
                .select('id, user_id, content, media_type, media_url, background_color, expires_at, created_at, is_deleted, privacy_type, viewer_ids')
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

            // Filter statuses based on privacy on client side for maximum reliability
            let filteredStatuses = statusRes.data || [];
            if (filteredStatuses.length > 0) {
                filteredStatuses = filteredStatuses.filter(s => {
                    if (s.user_id === userId) return true; // My own
                    if (s.privacy_type === 'all' || !s.privacy_type) return true; // Shared with all
                    if (s.privacy_type === 'selected' && s.viewer_ids?.includes(userId)) return true; // Specifically shared with me
                    return false;
                });
            }

            if (groupRes.error) throw groupRes.error;

            // Process Status Info
            const viewedStatusIds = new Set(viewsRes.data?.map(v => v.status_id) || []);
            const { decryptText, getChatKey } = await import('@/utils/chatCrypto');
            const statusInfoMap: Record<string, { count: number, viewedCount: number, thumbnail?: string, mediaType?: string, text?: string, bgColor?: string }> = {};

            // Sort by created_at descending to get the most recent status first
            const sortedStatuses = [...filteredStatuses].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            for (const s of sortedStatuses) {
                if (!statusInfoMap[s.user_id]) {
                    statusInfoMap[s.user_id] = { count: 0, viewedCount: 0 };
                    
                    // Decrypt latest status media for thumbnail
                    if (s.media_url) {
                        if (s.media_url.trim().startsWith('{')) {
                            try {
                                const statusKey = await getChatKey(s.user_id, s.user_id);
                                const decryptedUrl = await decryptText(s.media_url, statusKey);
                                statusInfoMap[s.user_id].thumbnail = decryptedUrl;
                                statusInfoMap[s.user_id].mediaType = s.media_type;
                            } catch (e) {
                                console.error('Thumbnail decryption error:', e);
                            }
                        } else {
                            statusInfoMap[s.user_id].thumbnail = s.media_url;
                            statusInfoMap[s.user_id].mediaType = s.media_type;
                        }
                    } else if (s.media_type === 'text') {
                        // For text statuses, decrypt and show the text
                        statusInfoMap[s.user_id].mediaType = 'text';
                        statusInfoMap[s.user_id].bgColor = s.background_color;
                        if (s.content && s.content.trim().startsWith('{')) {
                            try {
                                const statusKey = await getChatKey(s.user_id, s.user_id);
                                const decryptedText = await decryptText(s.content, statusKey);
                                statusInfoMap[s.user_id].text = decryptedText;
                            } catch (e) {
                                console.error('Text status decryption error:', e);
                            }
                        } else {
                            statusInfoMap[s.user_id].text = s.content;
                        }
                    }
                }
                statusInfoMap[s.user_id].count++;
                if (viewedStatusIds.has(s.id)) statusInfoMap[s.user_id].viewedCount++;
            }

            // 2. Save fetched statuses to Local DB and Sync Deletions
            if (db && filteredStatuses) {
                const fetchedStatusIds = filteredStatuses.map(s => s.id);
                filteredStatuses.forEach(s => saveLocalStatus(db, s));
                await syncLocalStatuses(db, fetchedStatusIds, userId);
            }

            // Process Unread Counts (filtered for groups user is in)
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
            (recentMsgsRes.data || []).forEach(m => {
                const chatId = m.group_id || (m.sender_id === userId ? m.receiver_id : m.sender_id);
                if (chatId && !lastActivityMap[chatId]) lastActivityMap[chatId] = m.created_at;
            });

            // Format Friends
            const { combinedItems: existingItems } = get();
            const formattedFriends = friendships.map((f: any) => {
                const otherProfile = f.type === 'sent' ? f.friend : f.user;
                if (!otherProfile) return null;
                const sInfo = statusInfoMap[otherProfile.id] || { count: 0, viewedCount: 0 };
                
                // Merge logic: Locked-First approach
                const existingItem = existingItems.find(i => i.id === otherProfile.id);
                
                // If either Supabase OR Local says it's true, we keep it true
                const isLocked = (f.is_locked === true) || (existingItem?.isLocked === true);
                const isFavorite = (f.is_favorite === true) || (existingItem?.isFavorite === true);
                const isArchived = (f.is_archived === true) || (existingItem?.isArchived === true);

                return {
                    id: otherProfile.id,
                    name: otherProfile.username || 'Unknown',
                    email: otherProfile.email,
                    img: otherProfile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(otherProfile.username || 'User')}&backgroundColor=F68537`,
                    unreadCount: unreadCountsMap[otherProfile.id] || 0,
                    statusCount: sInfo.count,
                    allStatusesViewed: sInfo.count > 0 && sInfo.count === sInfo.viewedCount,
                    db_is_online: otherProfile.is_online,
                    lastActivity: lastActivityMap[otherProfile.id] || '0',
                    isGroup: false,
                    isFavorite: !!isFavorite,
                    isArchived: !!isArchived,
                    isBlocked: blockedIds.includes(otherProfile.id),
                    isLocked: !!isLocked
                };


            }).filter(Boolean);


            // Save Friend Profiles to Local DB
            if (db) {
                friendships.forEach((f: any) => {
                    const p = f.type === 'sent' ? f.friend : f.user;
                    if (p) saveLocalProfile(db, p);
                });
            }


            // Format Groups
            const formattedGroups = (groupRes.data || []).filter(m => m.groups).map((m: any) => {
                const existingItem = existingItems.find(i => i.id === m.groups.id);
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



            // My Statuses (Optimization: use already fetched statusRes.data if it contains my statuses)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const { data: myAllStatuses } = await supabase.from('statuses').select('*').eq('user_id', userId).gt('created_at', sevenDaysAgo.toISOString()).order('created_at', { ascending: false });

            // Decrypt my own statuses for display
            const decryptedMyStatuses = await Promise.all((myAllStatuses || []).map(async (s) => {
                let decryptedContent = s.content;
                let decryptedMediaUrl = s.media_url;

                if (s.content && s.content.trim().startsWith('{')) {
                    try {
                        const statusKey = await getChatKey(userId, userId);
                        decryptedContent = await decryptText(s.content, statusKey);
                    } catch (e) {
                        console.error('My status content decryption error:', e);
                    }
                }
                if (s.media_url && s.media_url.trim().startsWith('{')) {
                    try {
                        const statusKey = await getChatKey(userId, userId);
                        decryptedMediaUrl = await decryptText(s.media_url, statusKey);
                    } catch (e) {
                        console.error('My status media decryption error:', e);
                    }
                }

                return {
                    ...s,
                    content: decryptedContent,
                    media_url: decryptedMediaUrl
                };
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

            // Combine and Sort
            const { onlineUsers } = get();
            const currentUserId = (require('./useAuthStore').useAuthStore.getState()).user?.id;
            const isConnected = currentUserId ? !!onlineUsers[currentUserId] : false;

            const combined = [...formattedFriends.map(f => {
                const isOnline = isConnected ? !!onlineUsers[f.id] : f.db_is_online === true;
                return { 
                    ...f, 
                    isOnline,
                    isTyping: onlineUsers[f.id]?.typingTo === currentUserId
                };
            }), ...formattedGroups];
            const sortedItems = Array.from(new Map(combined.map(item => [item.id, item])).values())
                .sort((a, b) => {
                    const tA = new Date(a.lastActivity).getTime() || 0;
                    const tB = new Date(b.lastActivity).getTime() || 0;
                    return tB - tA;
                });

            set({
                friends: formattedFriends,
                groups: formattedGroups,
                myStatuses: groupedMyStatus,
                statusInfo: statusInfoMap,
                combinedItems: sortedItems,
                lockedChatIds: sortedItems.filter(i => i.isLocked).map(i => i.id),
                loading: false
            });


            // 3. Save to Local DB
            if (db) {
                sortedItems.forEach(item => saveLocalConversation(db, item));
            }
        } catch (e: any) {
            console.error('loadFriends ERROR:', e);
            set({ error: e.message, loading: false });
        }
    },

    fetchBlockedUsers: async (userId) => {
        if (!userId) return;
        const { data, error } = await supabase.from('blocked_users').select('blocked_id').eq('blocker_id', userId);
        if (!error && data) set({ blockedUserIds: data.map(b => b.blocked_id) });
    },

    blockUser: async (currentUserId, targetId) => {
        console.log(`[BLOCK] Attempting to block user ${targetId} for ${currentUserId}`);
        const previousBlockedIds = get().blockedUserIds;
        const previousItems = get().combinedItems;
        
        // 1. Optimistic Update (Instant UI)
        set({ 
            blockedUserIds: [...previousBlockedIds, targetId],
            combinedItems: previousItems.map(item => 
                item.id === targetId ? { ...item, isBlocked: true } : item
            )
        });
        
        // 2. Local DB Update
        const { db } = useDbStore.getState();
        if (db) {
            console.log(`[BLOCK] Saving block to Local DB`);
            await saveLocalBlock(db, currentUserId, targetId);
        }

        // 3. Supabase Sync
        try {
            const { error } = await supabase.from('blocked_users').insert({ blocker_id: currentUserId, blocked_id: targetId });
            
            if (error) {
                console.error('[BLOCK] Supabase Sync Error:', error);
                // Rollback on error
                set({ 
                    blockedUserIds: previousBlockedIds,
                    combinedItems: previousItems
                });
                if (db) await deleteLocalBlock(db, currentUserId, targetId);
                require('react-native').Alert.alert("Block Failed", `Server error: ${error.message}`);
            } else {
                console.log('[BLOCK] Supabase Sync Success');
                get().loadFriends(currentUserId);
            }
        } catch (e: any) {
            console.error('[BLOCK] Catch Block Error:', e);
            require('react-native').Alert.alert("Block Error", e.message || "Unknown error occurred");
        }
    },




    unblockUser: async (currentUserId, targetId) => {
        console.log(`[UNBLOCK] Attempting to unblock user ${targetId} for ${currentUserId}`);
        const previousBlockedIds = get().blockedUserIds;
        const previousItems = get().combinedItems;
        
        // 1. Optimistic Update (Instant UI)
        set({ 
            blockedUserIds: previousBlockedIds.filter(id => id !== targetId),
            combinedItems: previousItems.map(item => 
                item.id === targetId ? { ...item, isBlocked: false } : item
            )
        });
        
        // 2. Local DB Update
        const { db } = useDbStore.getState();
        if (db) {
            console.log(`[UNBLOCK] Deleting block from Local DB`);
            await deleteLocalBlock(db, currentUserId, targetId);
        }

        // 3. Supabase Sync
        try {
            const { error } = await supabase.from('blocked_users').delete().eq('blocker_id', currentUserId).eq('blocked_id', targetId);
            
            if (error) {
                console.error('[UNBLOCK] Supabase Sync Error:', error);
                // Rollback on error
                set({ 
                    blockedUserIds: previousBlockedIds,
                    combinedItems: previousItems
                });
                if (db) await saveLocalBlock(db, currentUserId, targetId);
                require('react-native').Alert.alert("Unblock Failed", `Server error: ${error.message}`);
            } else {
                console.log('[UNBLOCK] Supabase Sync Success');
                get().loadFriends(currentUserId);
            }
        } catch (e: any) {
            console.error('[UNBLOCK] Catch Block Error:', e);
            require('react-native').Alert.alert("Unblock Error", e.message || "Unknown error occurred");
        }
    },




    leaveGroup: async (userId, groupId) => {
        try {
            let activeUserId = userId || (await supabase.auth.getUser()).data.user?.id || '';
            if (!activeUserId) throw new Error('User not authenticated');

            const { data: profile } = await supabase.from('profiles').select('username').eq('id', activeUserId).single();
            await supabase.from('messages').insert([{ group_id: groupId, sender_id: activeUserId, message: `SYSTEM_MSG: ${profile?.username || 'A user'} has left the group`, status: 'sent', is_read: false }]);
            const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', activeUserId);
            if (error) throw error;

            await get().loadFriends(activeUserId);
            return true;
        } catch (e) {
            console.error("FriendsStore: Error leaving group", e);
            return false;
        }
    },


    lockChat: async (chatId) => {
        const { db } = useDbStore.getState();
        const previousItems = get().combinedItems;
        const previousLocked = get().lockedChatIds;

        // Optimistic Update
        set({ 
            lockedChatIds: [...previousLocked, chatId],
            combinedItems: previousItems.map(item => 
                item.id === chatId ? { ...item, isLocked: true } : item
            )
        });

        if (db) {
            const item = previousItems.find(i => i.id === chatId);
            if (item) {
                const { saveLocalConversation } = await import('@/lib/localDb');
                await saveLocalConversation(db, { ...item, isLocked: true });
            }
        }

        // Supabase Sync
        const currentUserId = (require('./useAuthStore').useAuthStore.getState()).user?.id;
        if (currentUserId) {
            await supabase.from('friendships').update({ is_locked: true }).match({ user_id: currentUserId, friend_id: chatId });
        }
    },

    unlockChat: async (chatId) => {
        const { db } = useDbStore.getState();
        const previousItems = get().combinedItems;
        const previousLocked = get().lockedChatIds;

        // Optimistic Update
        set({ 
            lockedChatIds: previousLocked.filter(id => id !== chatId),
            combinedItems: previousItems.map(item => 
                item.id === chatId ? { ...item, isLocked: false } : item
            )
        });

        if (db) {
            const item = previousItems.find(i => i.id === chatId);
            if (item) {
                const { saveLocalConversation } = await import('@/lib/localDb');
                await saveLocalConversation(db, { ...item, isLocked: false });
            }
        }

        const currentUserId = (require('./useAuthStore').useAuthStore.getState()).user?.id;
        if (currentUserId) {
            await supabase.from('friendships').update({ is_locked: false }).match({ user_id: currentUserId, friend_id: chatId });
        }
    },

    isChatLocked: (chatId) => {
        return get().lockedChatIds.includes(chatId);
    },


    fetchGroupMembers: async (groupId) => {
        try {
            const { data, error } = await supabase
                .from('group_members')
                .select('user_id, role, joined_at, profiles:profiles(id, username, avatar_url, is_online)')
                .eq('group_id', groupId);
            if (error) throw error;
            return (data || []).map((m: any) => ({
                id: m.user_id,
                name: m.profiles?.username || 'Unknown',
                img: m.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.profiles?.username || 'U')}&backgroundColor=F68537`,
                role: m.role || 'member',
                joined_at: m.joined_at,
                isOnline: m.profiles?.is_online === true
            }));
        } catch (e) {
            console.error('fetchGroupMembers error:', e);
            return [];
        }
    },

    addGroupMember: async (groupId, userId, addedBy) => {
        try {
            // Check if addedBy is admin
            const { data: adminCheck } = await supabase
                .from('group_members')
                .select('role')
                .eq('group_id', groupId)
                .eq('user_id', addedBy)
                .single();
            if (!adminCheck || adminCheck.role !== 'admin') {
                require('react-native').Alert.alert('Permission Denied', 'Only admins can add members.');
                return false;
            }
            // Check if already member
            const { data: existing } = await supabase
                .from('group_members')
                .select('id')
                .eq('group_id', groupId)
                .eq('user_id', userId)
                .maybeSingle();
            if (existing) {
                require('react-native').Alert.alert('Already a Member', 'This user is already in the group.');
                return false;
            }
            const { error } = await supabase
                .from('group_members')
                .insert({ group_id: groupId, user_id: userId, role: 'member' });
            if (error) throw error;
            // Send system message
            const { data: profile } = await supabase.from('profiles').select('username').eq('id', userId).single();
            await supabase.from('messages').insert([{
                group_id: groupId,
                sender_id: addedBy,
                message: `SYSTEM_MSG: ${profile?.username || 'A user'} was added to the group`,
                status: 'sent',
                is_read: false
            }]);
            return true;
        } catch (e) {
            console.error('addGroupMember error:', e);
            require('react-native').Alert.alert('Error', 'Failed to add member.');
            return false;
        }
    },

    removeGroupMember: async (groupId, userId, removedBy) => {
        try {
            // Check if removedBy is admin
            const { data: adminCheck } = await supabase
                .from('group_members')
                .select('role')
                .eq('group_id', groupId)
                .eq('user_id', removedBy)
                .single();
            if (!adminCheck || adminCheck.role !== 'admin') {
                require('react-native').Alert.alert('Permission Denied', 'Only admins can remove members.');
                return false;
            }
            // Cannot remove other admins
            const { data: targetRole } = await supabase
                .from('group_members')
                .select('role')
                .eq('group_id', groupId)
                .eq('user_id', userId)
                .single();
            if (targetRole?.role === 'admin' && userId !== removedBy) {
                require('react-native').Alert.alert('Permission Denied', 'Cannot remove another admin.');
                return false;
            }
            const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
            if (error) throw error;
            // Send system message
            const { data: profile } = await supabase.from('profiles').select('username').eq('id', userId).single();
            await supabase.from('messages').insert([{
                group_id: groupId,
                sender_id: removedBy,
                message: `SYSTEM_MSG: ${profile?.username || 'A user'} was removed from the group`,
                status: 'sent',
                is_read: false
            }]);
            return true;
        } catch (e) {
            console.error('removeGroupMember error:', e);
            require('react-native').Alert.alert('Error', 'Failed to remove member.');
            return false;
        }
    },

    makeGroupAdmin: async (groupId, userId, requestedBy) => {
        try {
            // Check if requestedBy is admin
            const { data: adminCheck } = await supabase
                .from('group_members')
                .select('role')
                .eq('group_id', groupId)
                .eq('user_id', requestedBy)
                .single();
            if (!adminCheck || adminCheck.role !== 'admin') {
                require('react-native').Alert.alert('Permission Denied', 'Only admins can promote members.');
                return false;
            }
            const { error } = await supabase
                .from('group_members')
                .update({ role: 'admin' })
                .eq('group_id', groupId)
                .eq('user_id', userId);
            if (error) throw error;
            // Send system message
            const { data: profile } = await supabase.from('profiles').select('username').eq('id', userId).single();
            await supabase.from('messages').insert([{
                group_id: groupId,
                sender_id: requestedBy,
                message: `SYSTEM_MSG: ${profile?.username || 'A user'} is now an admin`,
                status: 'sent',
                is_read: false
            }]);
            return true;
        } catch (e) {
            console.error('makeGroupAdmin error:', e);
            require('react-native').Alert.alert('Error', 'Failed to make admin.');
            return false;
        }
    },

    reset: () => set({ friends: [], groups: [], combinedItems: [], myStatuses: { active: [] }, onlineUsers: {}, blockedUserIds: [], error: null })
}));
