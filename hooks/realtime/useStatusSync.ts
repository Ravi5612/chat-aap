import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useFriendsStore } from '@/store/useFriendsStore';

export const useStatusSync = (userId: string | null) => {
    useEffect(() => {
        if (!userId) return;

        // Shared channel for all status updates
        const statusChannel = supabase.channel('global-status-sync');

        statusChannel.on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'statuses'
            },
            async (payload) => {
                if (__DEV__) console.log('[DEBUG] GlobalRealtime: Status table change detected:', payload.eventType);
                
                const newRecord = payload.new as any;
                const oldRecord = payload.old as any;
                const changedUserId = newRecord?.user_id || oldRecord?.user_id;
                if (!changedUserId || changedUserId === userId) return;

                // Check if the person who updated their status is our friend
                const { friends } = useFriendsStore.getState();
                const isFriend = friends.some(f => f.friend.id === changedUserId);
                
                if (isFriend) {
                    if (__DEV__) console.log(`[DEBUG] GlobalRealtime: Friend ${changedUserId} updated status, reloading friends...`);
                    // force = true to bypass the duplicate-request throttle lock
                    useFriendsStore.getState().loadFriends(userId, true);
                }
            }
        );

        statusChannel.subscribe();

        return () => {
            supabase.removeChannel(statusChannel);
        };
    }, [userId]);
};
