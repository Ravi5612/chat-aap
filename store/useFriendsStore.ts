import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface FriendsState {
    friends: any[];
    groups: any[];
    combinedItems: any[];
    myStatuses: any;
    onlineUsers: Record<string, any>;
    blockedUserIds: string[];
    loading: boolean;
    error: string | null;
    setOnlineUsers: (users: Record<string, any>) => void;
    loadFriends: (userId: string) => Promise<void>;
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
    blockedUserIds: [],
    loading: false,
    error: null,

    setOnlineUsers: (onlineUsers) => {
        set({ onlineUsers });
        // Re-calculate combined items with online status
        const { friends, groups } = get();
        const friendsWithPresence = friends.map(f => ({
            ...f,
            isOnline: f.db_is_online !== false && !!onlineUsers[f.id]
        }));
        const combined = [...friendsWithPresence, ...groups];
        const uniqueItems = Array.from(new Map(combined.map(item => [item.id, item])).values());
        set({ combinedItems: uniqueItems });
    },

    loadFriends: async (userId) => {
        if (!userId) return;
        set({ loading: true, error: null });

        try {
            // Fetch blocked users first to filter or mark them
            await get().fetchBlockedUsers(userId);
            const blockedIds = get().blockedUserIds;

            // 1. Fetch Friends
            const { data: friendships, error: friendshipError } = await supabase
                .from('friendships')
                .select(`
          friend_id,
          is_favorite,
          is_archived,
          friend:profiles!friendships_friend_id_fkey(
            id, username, email, avatar_url, is_online
          )
        `)
                .eq('user_id', userId);

            if (friendshipError) throw friendshipError;

            // 2. Fetch Groups
            // ... (rest of loadFriends is same, but I'll filter out blocked in combined items if needed, 
            // but usually you want to see them just marked as blocked)
            // ...
            const { data: groupMemberships, error: groupError } = await supabase
                .from('group_members')
                .select(`
          group_id,
          groups (
            id, name, avatar_url
          )
        `)
                .eq('user_id', userId);

            if (groupError) throw groupError;

            // 3. Status Info
            const nowIso = new Date().toISOString();
            const { data: allActiveStatuses } = await supabase
                .from('statuses')
                .select('id, user_id, expires_at, is_deleted')
                .gt('expires_at', nowIso)
                .eq('is_deleted', false);

            const { data: myViews } = await supabase
                .from('status_views')
                .select('status_id')
                .eq('viewer_id', userId);

            const viewedStatusIds = new Set(myViews?.map(v => v.status_id) || []);
            const friendStatusInfo = (allActiveStatuses || []).reduce((acc: any, s: any) => {
                if (!acc[s.user_id]) acc[s.user_id] = { count: 0, viewedCount: 0 };
                acc[s.user_id].count++;
                if (viewedStatusIds.has(s.id)) acc[s.user_id].viewedCount++;
                return acc;
            }, {});

            // 4. Unread Counts
            let unreadCountsMap: any = {};
            const { data: pUnread } = await supabase
                .from('messages')
                .select('sender_id')
                .eq('receiver_id', userId)
                .eq('is_read', false);

            (pUnread || []).forEach(m => {
                unreadCountsMap[m.sender_id] = (unreadCountsMap[m.sender_id] || 0) + 1;
            });

            const gIds = (groupMemberships || []).map(m => m.group_id);
            if (gIds.length > 0) {
                const { data: gUnread } = await supabase
                    .from('messages')
                    .select('group_id')
                    .in('group_id', gIds)
                    .eq('is_read', false)
                    .neq('sender_id', userId);

                (gUnread || []).forEach(m => {
                    unreadCountsMap[m.group_id] = (unreadCountsMap[m.group_id] || 0) + 1;
                });
            }

            // Formatting
            const formattedFriends = (friendships || [])
                .filter((f: any) => f.friend)
                .map((f: any) => {
                    const profile = f.friend;
                    const sInfo = friendStatusInfo[profile.id] || { count: 0, viewedCount: 0 };
                    return {
                        id: profile.id,
                        name: profile.username || 'Unknown',
                        email: profile.email,
                        img: profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.username || 'User')}&backgroundColor=F68537`,
                        unreadCount: unreadCountsMap[profile.id] || 0,
                        statusCount: sInfo.count,
                        allStatusesViewed: sInfo.count > 0 && sInfo.count === sInfo.viewedCount,
                        db_is_online: profile.is_online,
                        isFavorite: f.is_favorite,
                        isArchived: f.is_archived,
                        isGroup: false
                    };
                });

            const formattedGroups = (groupMemberships || [])
                .filter((m: any) => m.groups)
                .map((m: any) => {
                    const g = m.groups;
                    return {
                        id: g.id,
                        name: g.name,
                        img: g.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(g.name)}&backgroundColor=F68537`,
                        unreadCount: unreadCountsMap[g.id] || 0,
                        isGroup: true,
                        statusCount: 0
                    };
                });

            // My Statuses Logic
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const { data: myAllStatuses } = await supabase
                .from('statuses')
                .select('*')
                .eq('user_id', userId)
                .gt('created_at', sevenDaysAgo.toISOString())
                .order('created_at', { ascending: false });

            const now = new Date();
            const groupedMyStatus: any = { active: [] };
            (myAllStatuses || []).forEach(status => {
                const expiresAt = new Date(status.expires_at);
                const isStatusActive = expiresAt > now && (status.is_deleted === false || status.is_deleted === null);
                if (isStatusActive) {
                    groupedMyStatus.active.push(status);
                } else {
                    const sDate = new Date(status.created_at);
                    const diffDays = Math.floor((now.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));
                    let dateKey = '';
                    if (diffDays === 0) dateKey = 'Today';
                    else if (diffDays === 1) dateKey = 'Yesterday';
                    else dateKey = sDate.toLocaleDateString('en-US', { weekday: 'long' });
                    if (!groupedMyStatus[dateKey]) groupedMyStatus[dateKey] = [];
                    groupedMyStatus[dateKey].push(status);
                }
            });

            const { onlineUsers } = get();
            const friendsWithPresence = formattedFriends.map(f => ({
                ...f,
                isOnline: f.db_is_online !== false && !!onlineUsers[f.id]
            }));
            const combined = [...friendsWithPresence, ...formattedGroups];

            set({
                friends: formattedFriends,
                groups: formattedGroups,
                myStatuses: groupedMyStatus,
                combinedItems: Array.from(new Map(combined.map(item => [item.id, item])).values()),
                loading: false
            });

        } catch (e: any) {
            set({ error: e.message, loading: false });
        }
    },

    fetchBlockedUsers: async (userId) => {
        if (!userId) return;
        const { data, error } = await supabase
            .from('blocked_users')
            .select('blocked_id')
            .eq('blocker_id', userId);

        if (!error && data) {
            set({ blockedUserIds: data.map(b => b.blocked_id) });
        }
    },

    blockUser: async (currentUserId, targetId) => {
        const { error } = await supabase
            .from('blocked_users')
            .insert({ blocker_id: currentUserId, blocked_id: targetId });

        if (!error) {
            const { blockedUserIds } = get();
            set({ blockedUserIds: [...blockedUserIds, targetId] });
            // Also optionally reload friends to update state
            get().loadFriends(currentUserId);
        }
    },

    unblockUser: async (currentUserId, targetId) => {
        const { error } = await supabase
            .from('blocked_users')
            .delete()
            .eq('blocker_id', currentUserId)
            .eq('blocked_id', targetId);

        if (!error) {
            const { blockedUserIds } = get();
            set({ blockedUserIds: blockedUserIds.filter(id => id !== targetId) });
            get().loadFriends(currentUserId);
        }
    },

    leaveGroup: async (userId, groupId) => {
        try {
            const { error } = await supabase
                .from('group_members')
                .delete()
                .eq('group_id', groupId)
                .eq('user_id', userId);

            if (error) throw error;

            await get().loadFriends(userId);
            return true;
        } catch (e) {
            console.error("FriendsStore: Error leaving group", e);
            return false;
        }
    },

    reset: () => set({ friends: [], groups: [], combinedItems: [], myStatuses: { active: [] }, onlineUsers: {}, blockedUserIds: [], error: null })
}));
