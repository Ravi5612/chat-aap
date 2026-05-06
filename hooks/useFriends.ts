import { useEffect, useRef } from 'react';
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

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Debounced load function to prevent spamming the server
    const debouncedLoad = (userId: string) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            loadFriends(userId);
        }, 500); // 500ms debounce
    };

    useEffect(() => {
        if (!currentUser) return;

        const uniqueChannelId = `useFriends-${currentUser.id}-${Math.random().toString(36).substring(7)}`;
        console.log(`[DEBUG] useFriends: Subscribing to channel: ${uniqueChannelId}`);

        const channel = supabase
            .channel(uniqueChannelId)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
                debouncedLoad(currentUser.id);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                debouncedLoad(currentUser.id);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'statuses' }, () => {
                debouncedLoad(currentUser.id);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'status_views' }, () => {
                debouncedLoad(currentUser.id);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                if (payload.new.receiver_id === currentUser.id || payload.new.sender_id === currentUser.id || payload.new.group_id) {
                    debouncedLoad(currentUser.id);
                }
            })
            .subscribe();

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
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
