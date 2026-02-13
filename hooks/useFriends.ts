import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const useFriends = () => {
    const [friends, setFriends] = useState<any[]>([]);
    const [myStatuses, setMyStatuses] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [combinedItems, setCombinedItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);
        };
        getUser();
    }, []);

    const loadFriends = async () => {
        if (!currentUser) return;
        setLoading(true);

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

            // Fetch unread counts
            const { data: unreadData } = await supabase
                .from('messages')
                .select('sender_id, group_id')
                .eq('is_read', false)
                .neq('sender_id', currentUser.id)
                .or(`receiver_id.eq.${currentUser.id},group_id.not.is.null`);

            const unreadCountsMap = (unreadData || []).reduce((acc: any, msg: any) => {
                const key = msg.group_id || msg.sender_id;
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {});

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

            // 3. Fetch My Statuses
            const { data: myStatusData } = await supabase
                .from('statuses')
                .select('*')
                .eq('user_id', currentUser.id)
                .gt('expires_at', new Date().toISOString())
                .eq('is_deleted', false);

            const combined = [...formattedFriends, ...formattedGroups];
            const uniqueItems = Array.from(new Map(combined.map(item => [item.id, item])).values());

            setMyStatuses(myStatusData || []);
            setFriends(formattedFriends);
            setGroups(formattedGroups);
            setCombinedItems(uniqueItems);

        } catch (error) {
            console.error('Error loading friends:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser) {
            loadFriends();
        }
    }, [currentUser]);

    return { friends, groups, combinedItems, myStatuses, loading, loadFriends };
};
