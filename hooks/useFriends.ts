import { useEffect, useRef, useCallback } from 'react';
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
        statusInfo,
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

    // ✅ Merged 2 duplicate useEffects into 1 — both depended on currentUser,
    //    causing double-fire on mount. Also fixed dep to currentUser?.id to avoid
    //    re-subscribing when user object reference changes but ID stays same.
    useEffect(() => {
        if (!currentUser) return;

        // Initial load (immediate, not debounced)
        loadFriends(currentUser.id);

        // Realtime subscription
        const uniqueChannelId = `useFriends-${currentUser.id}`;
        if (__DEV__) console.log(`[DEBUG] useFriends: Subscribing to channel: ${uniqueChannelId}`);

        // Cleanup any lingering channel from fast refresh or StrictMode
        const existingChannel = supabase.getChannels().find(c => c.topic === `realtime:${uniqueChannelId}`);
        if (existingChannel) supabase.removeChannel(existingChannel);

        const channel = supabase
            .channel(uniqueChannelId)
            // Listen when currentUser sends a request or blocks
            .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `user_id=eq.${currentUser.id}` }, () => debouncedLoad(currentUser.id))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `friend_id=eq.${currentUser.id}` }, () => debouncedLoad(currentUser.id))
            .subscribe();

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id]);

    const loadFriendsWrapper = useCallback((force = false) => {
        if (currentUser) {
            loadFriends(currentUser.id, force);
        }
    }, [currentUser, loadFriends]);

    return { friends, groups, combinedItems, myStatuses, statusInfo, loading, error, loadFriends: loadFriendsWrapper };
};
