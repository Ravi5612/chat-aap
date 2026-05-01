import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
        loadFriends
    } = useFriendsStore();

    useEffect(() => {
        if (!currentUser) return;

        const uniqueChannelId = `useFriends-${currentUser.id}-${Math.random().toString(36).substring(7)}`;
        console.log(`[DEBUG] useFriends: Subscribing to channel: ${uniqueChannelId}`);

        // Listen for all relevant changes to refresh the list
        const channel = supabase
            .channel(uniqueChannelId)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
                console.log('[DEBUG] useFriends: Friendships change detected');
                loadFriends(currentUser.id);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                console.log('[DEBUG] useFriends: Profiles change detected');
                loadFriends(currentUser.id);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'statuses' }, () => {
                console.log('[DEBUG] useFriends: Statuses change detected');
                loadFriends(currentUser.id);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'status_views' }, () => {
                console.log('[DEBUG] useFriends: StatusViews change detected');
                loadFriends(currentUser.id);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                if (payload.new.receiver_id === currentUser.id || payload.new.sender_id === currentUser.id || payload.new.group_id) {
                    console.log('[DEBUG] useFriends: New message detected');
                    loadFriends(currentUser.id);
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
                if (payload.new.is_read) {
                    console.log('[DEBUG] useFriends: Message read status updated');
                    loadFriends(currentUser.id);
                }
            })
            .subscribe((status) => {
                console.log(`[DEBUG] useFriends: Subscription status: ${status}`);
            });

        return () => {
            console.log(`[DEBUG] useFriends: Cleaning up channel: ${uniqueChannelId}`);
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
