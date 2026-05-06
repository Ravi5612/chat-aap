import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface FriendsState {
    friends: any[];
    groups: any[];
    combinedItems: any[];
    myStatuses: any;
    onlineUsers: Record<string, any>;
    globalChannel: any | null;
    blockedUserIds: string[];
    loading: boolean;
    error: string | null;
    setOnlineUsers: (users: Record<string, any>) => void;
    loadFriends: (userId: string, force?: boolean) => Promise<void>;
    fetchBlockedUsers: (userId: string) => Promise<void>;
    blockUser: (currentUserId: string, targetId: string) => Promise<void>;
    unblockUser: (currentUserId: string, targetId: string) => Promise<void>;
    leaveGroup: (userId: string, groupId: string) => Promise<boolean>;
    reset: () => void;
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
    friends: [],
    groups: [],
    combinedItems: [],
    myStatuses: { active: [] },
    onlineUsers: {},
    globalChannel: null,
    blockedUserIds: [],
    loading: false,
    error: null,

    setOnlineUsers: (onlineUsers) => {
        set({ onlineUsers });
        const { friends, groups } = get();
        if (friends.length === 0 && groups.length === 0) return;

        const currentUserId = (require('./useAuthStore').useAuthStore.getState()).user?.id;
        const friendsWithPresence = friends.map(f => ({
            ...f,
            isOnline: !!onlineUsers[f.id] || f.db_is_online === true,
            isTyping: onlineUsers[f.id]?.typingTo === currentUserId
        }));

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
        
        // Silent loading: Only show loader if we have no data yet OR if it's a forced refresh
        const { combinedItems } = get();
        const shouldShowLoading = combinedItems.length === 0 || force;
        
        set({ loading: shouldShowLoading, error: null });

        try {
            // 1. Fetch Blocked Users & Friendships in parallel
            const [blockedRes, friendshipsSent, friendshipsRecd] = await Promise.all([
                supabase.from('blocked_users').select('blocked_id').eq('blocker_id', userId),
                supabase.from('friendships').select(`is_favorite, is_archived, friend_id, friend:profiles!friendships_friend_id_fkey(id, username, email, avatar_url, is_online)`).eq('user_id', userId),
                supabase.from('friendships').select(`is_favorite, is_archived, user_id, user:profiles!friendships_user_id_fkey(id, username, email, avatar_url, is_online)`).eq('friend_id', userId)
            ]);

            const blockedIds = blockedRes.data?.map(b => b.blocked_id) || [];
            set({ blockedUserIds: blockedIds });

            const friendships = [
                ...(friendshipsSent.data || []).map(f => ({ ...f, type: 'sent' })),
                ...(friendshipsRecd.data || []).map(f => ({ ...f, type: 'recd' }))
            ];

            const friendIds = friendships.map(f => f.type === 'sent' ? f.friend_id : f.user_id);
            const allRelevantIds = [userId, ...friendIds];

            // 2. Fetch Groups, Statuses (for friends only), and Unread Counts in parallel
            const nowIso = new Date().toISOString();
            const [groupRes, statusRes, viewsRes, unreadRes, recentMsgsRes] = await Promise.all([
                supabase.from('group_members').select('group_id, groups (id, name, avatar_url)').eq('user_id', userId),
                supabase.from('statuses').select('id, user_id, expires_at, is_deleted').in('user_id', allRelevantIds).gt('expires_at', nowIso).eq('is_deleted', false),
                supabase.from('status_views').select('status_id').eq('viewer_id', userId),
                supabase.from('messages').select('sender_id, group_id').or(`receiver_id.eq.${userId}, group_id.not.is.null`).eq('is_read', false),
                supabase.from('messages').select('created_at, sender_id, receiver_id, group_id').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: false }).limit(200)
            ]);

            if (groupRes.error) throw groupRes.error;

            // Process Status Info
            const viewedStatusIds = new Set(viewsRes.data?.map(v => v.status_id) || []);
            const statusInfoMap = (statusRes.data || []).reduce((acc: any, s: any) => {
                if (!acc[s.user_id]) acc[s.user_id] = { count: 0, viewedCount: 0 };
                acc[s.user_id].count++;
                if (viewedStatusIds.has(s.id)) acc[s.user_id].viewedCount++;
                return acc;
            }, {});

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
            const formattedFriends = friendships.map((f: any) => {
                const otherProfile = f.type === 'sent' ? f.friend : f.user;
                if (!otherProfile) return null;
                const sInfo = statusInfoMap[otherProfile.id] || { count: 0, viewedCount: 0 };
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
                    isFavorite: f.is_favorite,
                    isArchived: f.is_archived
                };
            }).filter(Boolean);

            // Format Groups
            const formattedGroups = (groupRes.data || []).filter(m => m.groups).map((m: any) => ({
                id: m.groups.id,
                name: m.groups.name,
                img: m.groups.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.groups.name)}&backgroundColor=F68537`,
                unreadCount: unreadCountsMap[m.groups.id] || 0,
                isGroup: true,
                lastActivity: lastActivityMap[m.groups.id] || '0',
                statusCount: 0
            }));

            // My Statuses (Optimization: use already fetched statusRes.data if it contains my statuses)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const { data: myAllStatuses } = await supabase.from('statuses').select('*').eq('user_id', userId).gt('created_at', sevenDaysAgo.toISOString()).order('created_at', { ascending: false });

            const groupedMyStatus: any = { active: [] };
            const now = new Date();
            (myAllStatuses || []).forEach(status => {
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
            const combined = [...formattedFriends.map(f => ({ 
                ...f, 
                isOnline: !!onlineUsers[f.id] || f.db_is_online === true,
                isTyping: onlineUsers[f.id]?.typingTo === currentUserId
            })), ...formattedGroups];
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
                combinedItems: sortedItems,
                loading: false
            });
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
        const { error } = await supabase.from('blocked_users').insert({ blocker_id: currentUserId, blocked_id: targetId });
        if (!error) {
            set({ blockedUserIds: [...get().blockedUserIds, targetId] });
            get().loadFriends(currentUserId);
        }
    },

    unblockUser: async (currentUserId, targetId) => {
        const { error } = await supabase.from('blocked_users').delete().eq('blocker_id', currentUserId).eq('blocked_id', targetId);
        if (!error) {
            set({ blockedUserIds: get().blockedUserIds.filter(id => id !== targetId) });
            get().loadFriends(currentUserId);
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

    reset: () => set({ friends: [], groups: [], combinedItems: [], myStatuses: { active: [] }, onlineUsers: {}, blockedUserIds: [], error: null })
}));
