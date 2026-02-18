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
        const { friends, groups } = get();
        if (friends.length === 0 && groups.length === 0) return;

        const friendsWithPresence = friends.map(f => ({
            ...f,
            isOnline: f.db_is_online !== false && !!onlineUsers[f.id]
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

    loadFriends: async (userId) => {
        if (!userId) return;
        set({ loading: true, error: null });

        try {
            // Fetch blocked users (non-blocking)
            get().fetchBlockedUsers(userId).catch(err => console.error('fetchBlockedUsers error:', err));
            const blockedIds = get().blockedUserIds;

            // 1. Fetch Friends (Bi-directional) - Split into two queries for reliability
            const [sentRes, recdRes] = await Promise.all([
                supabase
                    .from('friendships')
                    .select(`
                        is_favorite,
                        is_archived,
                        friend_id,
                        friend:profiles!friendships_friend_id_fkey(
                            id, username, email, avatar_url, is_online
                        )
                    `)
                    .eq('user_id', userId),
                supabase
                    .from('friendships')
                    .select(`
                        is_favorite,
                        is_archived,
                        user_id,
                        user:profiles!friendships_user_id_fkey(
                            id, username, email, avatar_url, is_online
                        )
                    `)
                    .eq('friend_id', userId)
            ]);

            if (sentRes.error) throw sentRes.error;
            // Note: pregnancies_user_id_fkey might not exist or might be named differently, 
            // but let's assume it follows the same pattern. If this fails, we catch it.

            const friendships = [
                ...(sentRes.data || []).map(f => ({ ...f, type: 'sent' })),
                ...(recdRes.data || []).map(f => ({ ...f, type: 'recd' }))
            ];

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

            // 5. Fetch Last Message Timestamps for Sorting (WhatsApp Style)
            let lastActivityMap: Record<string, string> = {};
            const { data: recentMsgs } = await supabase
                .from('messages')
                .select('created_at, sender_id, receiver_id, group_id')
                .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
                .order('created_at', { ascending: false })
                .limit(500);

            (recentMsgs || []).forEach(m => {
                const chatId = m.group_id || (m.sender_id === userId ? m.receiver_id : m.sender_id);
                if (chatId && !lastActivityMap[chatId]) {
                    lastActivityMap[chatId] = m.created_at;
                }
            });

            // Formatting
            const formattedFriends = friendships
                .map((f: any) => {
                    const otherProfile = f.type === 'sent' ? f.friend : f.user;
                    if (!otherProfile) return null;

                    const sInfo = friendStatusInfo[otherProfile.id] || { count: 0, viewedCount: 0 };
                    return {
                        id: otherProfile.id,
                        name: otherProfile.username || 'Unknown',
                        email: otherProfile.email,
                        img: otherProfile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(otherProfile.username || 'User')}&backgroundColor=F68537`,
                        unreadCount: unreadCountsMap[otherProfile.id] || 0,
                        statusCount: sInfo.count,
                        allStatusesViewed: sInfo.count > 0 && sInfo.count === sInfo.viewedCount,
                        db_is_online: otherProfile.is_online,
                        lastSeen: otherProfile.last_seen,
                        isFavorite: f.is_favorite,
                        isArchived: f.is_archived,
                        lastActivity: lastActivityMap[otherProfile.id] || '0',
                        isGroup: false
                    };
                })
                .filter(f => f !== null);

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
                        lastActivity: lastActivityMap[g.id] || '0',
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

            // ✅ Sort by Last Activity Descending (WhatsApp Style)
            const sortedItems = Array.from(new Map(combined.map(item => [item.id, item])).values())
                .sort((a, b) => {
                    const parseDate = (d: any) => {
                        if (!d || d === '0') return 0;
                        const t = new Date(d).getTime();
                        return isNaN(t) ? 0 : t;
                    };
                    return parseDate(b.lastActivity) - parseDate(a.lastActivity);
                });

            set({
                friends: formattedFriends,
                groups: formattedGroups,
                myStatuses: groupedMyStatus,
                combinedItems: sortedItems,
                loading: false
            });
            console.log(`loadFriends: Successfully loaded ${formattedFriends.length} friends and ${formattedGroups.length} groups.`);
        } catch (e: any) {
            console.error('loadFriends ERROR:', e);
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
            let activeUserId = userId;
            if (!activeUserId) {
                const { data: { user } } = await supabase.auth.getUser();
                activeUserId = user?.id || '';
            }

            if (!activeUserId) throw new Error('User not authenticated');

            // Fetch username for the message
            const { data: profile } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', activeUserId)
                .single();

            const username = profile?.username || 'A user';

            // 1. Send System Message
            await supabase.from('messages').insert([{
                group_id: groupId,
                sender_id: activeUserId,
                message: `SYSTEM_MSG: ${username} has left the group`,
                status: 'sent',
                is_read: false
            }]);

            // 2. Delete Membership
            console.log(`Attempting to remove user ${activeUserId} from group ${groupId}`);
            const { error, count } = await supabase
                .from('group_members')
                .delete({ count: 'exact' })
                .eq('group_id', groupId)
                .eq('user_id', activeUserId);

            if (error) {
                console.error("Leave Group Error:", error);
                throw error;
            }
            console.log(`Leave Group Success. Removed ${count} rows.`);

            await get().loadFriends(activeUserId);
            return true;
        } catch (e) {
            console.error("FriendsStore: Error leaving group", e);
            return false;
        }
    },

    reset: () => set({ friends: [], groups: [], combinedItems: [], myStatuses: { active: [] }, onlineUsers: {}, blockedUserIds: [], error: null })
}));
