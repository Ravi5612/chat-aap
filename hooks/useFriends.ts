import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const useFriends = () => {
    const [friends, setFriends] = useState<any[]>([]);
    const [myStatuses, setMyStatuses] = useState<any[]>([]);
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

    const loadFriends = async () => {
        if (!currentUser) {
            console.log('useFriends: No currentUser found, skipping load');
            return;
        }

        console.log('useFriends: Starting data load for user:', currentUser.id);
        setLoading(true);
        setError(null);

        try {
            // 1. Fetch Friends
            console.log('useFriends: Fetching friendships...');
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

            if (friendshipError) {
                console.error('useFriends: Friendship error:', friendshipError);
                throw new Error('Failed to load friends list');
            }
            console.log('useFriends: Found friendships:', friendships?.length || 0);

            // 2. Fetch Groups
            console.log('useFriends: Fetching group memberships...');
            const { data: groupMemberships, error: groupError } = await supabase
                .from('group_members')
                .select(`
                    group_id,
                    groups (
                        id, name, avatar_url
                    )
                `)
                .eq('user_id', currentUser.id);

            if (groupError) {
                console.error('useFriends: Group error:', groupError);
            }
            console.log('useFriends: Found group memberships:', groupMemberships?.length || 0);

            // 3. Fetch unread counts (Segmented for better performance)
            console.log('useFriends: Fetching unread counts...');
            let unreadCountsMap: any = {};

            // Personal messages unread
            const { data: pUnread } = await supabase
                .from('messages')
                .select('sender_id')
                .eq('receiver_id', currentUser.id)
                .eq('is_read', false);

            (pUnread || []).forEach(m => {
                unreadCountsMap[m.sender_id] = (unreadCountsMap[m.sender_id] || 0) + 1;
            });

            // Group messages unread (if any group IDs exist)
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
                    return {
                        id: profile.id,
                        name: profile.username || 'Unknown',
                        email: profile.email,
                        img: profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.username || 'User')}&backgroundColor=F68537`,
                        unreadCount: unreadCountsMap[profile.id] || 0,
                        isOnline: profile.is_online,
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
                        isGroup: true
                    };
                });

            // 4. Fetch My Statuses
            console.log('useFriends: Fetching my statuses...');
            const { data: myStatusData } = await supabase
                .from('statuses')
                .select('*')
                .eq('user_id', currentUser.id)
                .gt('expires_at', new Date().toISOString())
                .eq('is_deleted', false);

            const combined = [...formattedFriends, ...formattedGroups];
            const uniqueItems = Array.from(new Map(combined.map(item => [item.id, item])).values());

            console.log('useFriends: Finished load. Total items:', uniqueItems.length);
            setMyStatuses(myStatusData || []);
            setFriends(formattedFriends);
            setGroups(formattedGroups);
            setCombinedItems(uniqueItems);

        } catch (error: any) {
            console.error('useFriends: Critical error in loadFriends:', error);
            setError(error.message || 'An unknown error occurred');
        } finally {
            setLoading(false);
            console.log('useFriends: Loading done');
        }
    };

    useEffect(() => {
        if (currentUser) {
            loadFriends();
        }
    }, [currentUser]);

    return { friends, groups, combinedItems, myStatuses, loading, error, loadFriends };
};
