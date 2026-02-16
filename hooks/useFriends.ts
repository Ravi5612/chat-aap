import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePresence } from './usePresence';
import { useFriendsStore } from '@/store/useFriendsStore';
import { useAuthStore } from '@/store/useAuthStore';

export const useFriends = () => {
    const { user: currentUser } = useAuthStore();
    const {
        friends,
        groups,
        combinedItems,
        myStatuses,
        loading,
        error,
        loadFriends,
        setOnlineUsers
    } = useFriendsStore();

    const { onlineUsers } = usePresence(currentUser?.id);

    useEffect(() => {
        setOnlineUsers(onlineUsers);
    }, [onlineUsers]);

    useEffect(() => {
        if (!currentUser) return;

        // Listen for all relevant changes to refresh the list
        const channel = supabase
            .channel('useFriends-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => loadFriends(currentUser.id))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadFriends(currentUser.id))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'statuses' }, () => loadFriends(currentUser.id))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'status_views' }, () => loadFriends(currentUser.id))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                if (payload.new.receiver_id === currentUser.id || payload.new.group_id) {
                    loadFriends(currentUser.id);
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
                if (payload.new.is_read) {
                    loadFriends(currentUser.id);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser]);

    useEffect(() => {
        if (currentUser) {
            loadFriends(currentUser.id);
        }
    }, [currentUser]);

    return { friends, groups, combinedItems, myStatuses, loading, error, loadFriends: () => currentUser && loadFriends(currentUser.id) };
};
