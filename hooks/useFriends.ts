import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePresence } from './usePresence';

export const useFriends = () => {
    const [friends, setFriends] = useState<any[]>([]);
    const [myStatuses, setMyStatuses] = useState<any>({ active: [] });
    const [groups, setGroups] = useState<any[]>([]);
    const [combinedItems, setCombinedItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const getUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                console.log('useFriends: Auth user fetch:', user?.id || 'No user');
                setCurrentUser(user);
            } catch (e: any) {
                console.error('useFriends: Auth fetch error:', e);
                setError('Authentication failed');
            }
        };
        getUser();
    }, []);

    const { onlineUsers } = usePresence(currentUser?.id);

    const loadFriends = async () => {
        if (!currentUser) return;

        setLoading(true);
        setError(null);

        try {
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
                .eq('user_id', currentUser.id);

            if (friendshipError) throw friendshipError;

            // 2. Fetch Groups
            const { data: groupMemberships, error: groupError } = await supabase
                .from('group_members')
                .select(`
                    group_id,
                    groups (
                        id, name, avatar_url
                    )
                `)
                .eq('user_id', currentUser.id);

            // 3. Fetch Status Stories information (matching web app logic)
            const nowIso = new Date().toISOString();
            console.log('useFriends: Fetching active statuses. Now:', nowIso);
            const { data: allActiveStatuses, error: statusErr } = await supabase
                .from('statuses')
                .select('id, user_id, expires_at, is_deleted')
                .gt('expires_at', nowIso)
                .eq('is_deleted', false);

            if (statusErr) console.error('useFriends: Status Fetch Error:', statusErr);
            console.log('useFriends: allActiveStatuses count:', allActiveStatuses?.length || 0);

            const { data: myViews } = await supabase
                .from('status_views')
                .select('status_id')
                .eq('viewer_id', currentUser.id);

            const viewedStatusIds = new Set(myViews?.map(v => v.status_id) || []);
            const friendStatusInfo = (allActiveStatuses || []).reduce((acc: any, s: any) => {
                if (!acc[s.user_id]) acc[s.user_id] = { count: 0, viewedCount: 0 };
                acc[s.user_id].count++;
                if (viewedStatusIds.has(s.id)) acc[s.user_id].viewedCount++;
                return acc;
            }, {});

            console.log('useFriends: friendStatusInfo keys (users with status):', Object.keys(friendStatusInfo));

            // 4. Fetch unread counts
            let unreadCountsMap: any = {};
            const { data: pUnread } = await supabase
                .from('messages')
                .select('sender_id')
                .eq('receiver_id', currentUser.id)
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
                    .neq('sender_id', currentUser.id);

                (gUnread || []).forEach(m => {
                    unreadCountsMap[m.group_id] = (unreadCountsMap[m.group_id] || 0) + 1;
                });
            }

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

            // 5. Fetch My Active and Archived/Deleted Statuses for History (7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { data: myAllStatuses, error: myStatusErr } = await supabase
                .from('statuses')
                .select('*')
                .eq('user_id', currentUser.id)
                .gt('created_at', sevenDaysAgo.toISOString())
                .order('created_at', { ascending: false });

            if (myStatusErr) console.error('useFriends: My Status Fetch Error:', myStatusErr);
            console.log('useFriends: myAllStatuses count:', myAllStatuses?.length || 0);

            // Group My Statuses: active vs historical
            const now = new Date();
            const groupedMyStatus: any = { active: [] };

            (myAllStatuses || []).forEach(status => {
                const expiresAt = new Date(status.expires_at);
                const isStatusActive = expiresAt > now && (status.is_deleted === false || status.is_deleted === null);

                if (isStatusActive) {
                    groupedMyStatus.active.push(status);
                } else {
                    // Group by date for history
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

            setMyStatuses(groupedMyStatus);
            setFriends(formattedFriends);
            setGroups(formattedGroups);

        } catch (error: any) {
            console.error('useFriends Error:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Calculate combined items with real-time presence instantly
    useEffect(() => {
        const friendsWithPresence = friends.map(f => ({
            ...f,
            isOnline: f.db_is_online !== false && !!onlineUsers[f.id]
        }));

        const combined = [...friendsWithPresence, ...groups];
        const uniqueItems = Array.from(new Map(combined.map(item => [item.id, item])).values());
        setCombinedItems(uniqueItems);
    }, [friends, groups, onlineUsers]);

    useEffect(() => {
        if (!currentUser) return;

        // Listen for all relevant changes to refresh the list
        const channel = supabase
            .channel('useFriends-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => loadFriends())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadFriends())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'statuses' }, () => loadFriends())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'status_views' }, () => loadFriends())
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                if (payload.new.receiver_id === currentUser.id || payload.new.group_id) {
                    loadFriends();
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
                if (payload.new.is_read) {
                    loadFriends();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser]);

    useEffect(() => {
        if (currentUser) {
            loadFriends();
        }
    }, [currentUser]);

    return { friends, groups, combinedItems, myStatuses, loading, error, loadFriends };
};
