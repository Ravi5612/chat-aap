import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useFriendsStore } from '@/store/useFriendsStore';

export const usePresenceSync = (userId: string | null) => {
    const setOnlineUsers = useFriendsStore(state => state.setOnlineUsers);

    useEffect(() => {
        if (!userId) return;

        // 2. Shared Global Presence Channel (For real-time online status and typing sync)
        const presenceChannel = supabase.channel('global-presence');
        useFriendsStore.setState({ globalChannel: presenceChannel });

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const newState = presenceChannel.presenceState();
                const onlineMap: Record<string, any> = {};

                Object.keys(newState).forEach((key) => {
                    const userPresence = newState[key] as any[];
                    if (userPresence && userPresence.length > 0) {
                        const pres = userPresence[0];
                        if (pres.userId) {
                            onlineMap[pres.userId] = pres;
                        }
                    }
                });

                if (__DEV__) console.log('[DEBUG] Presence sync updated. Online users count:', Object.keys(onlineMap).length);
                setOnlineUsers(onlineMap);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                // if (__DEV__) console.log('[DEBUG] Presence: User joined:', newPresences);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                // if (__DEV__) console.log('[DEBUG] Presence: User left:', leftPresences);
            });

        presenceChannel.subscribe(async (status) => {
            if (__DEV__) console.log('[DEBUG] GlobalRealtime PresenceChannel Status:', status);
            if (status === 'SUBSCRIBED') {
                await presenceChannel.track({
                    userId: userId,
                    online_at: new Date().toISOString(),
                });
            }
        });

        return () => {
            if (__DEV__) console.log('[DEBUG] GlobalRealtime: Cleaning up presence channels...');
            supabase.removeChannel(presenceChannel);
            useFriendsStore.setState({ globalChannel: null });
        };
    }, [userId, setOnlineUsers]);
};
