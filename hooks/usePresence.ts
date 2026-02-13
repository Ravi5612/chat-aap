import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export const usePresence = (myUserId: string | null) => {
    const [onlineUsers, setOnlineUsers] = useState<Record<string, any>>({});

    useEffect(() => {
        if (!myUserId) return;

        console.log('Presence: Subscribing to online-users for:', myUserId);

        const channel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: myUserId,
                },
            },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                console.log('Presence: Sync State Keys:', Object.keys(state));
                console.log('Presence: Full State (first 2 keys):', Object.keys(state).slice(0, 2));
                setOnlineUsers(state);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                console.log('Presence: Join:', key, newPresences[0]?.online_at);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                console.log('Presence: Leave:', key);
            })
            .subscribe(async (status) => {
                console.log('Presence: Subscription Status:', status);
                if (status === 'SUBSCRIBED') {
                    await channel.track({ online_at: new Date().toISOString() });
                }
            });

        return () => {
            console.log('Presence: Removing channel...');
            supabase.removeChannel(channel);
        };
    }, [myUserId]);

    const isUserOnline = (userId: string) => {
        return !!onlineUsers[userId];
    };

    return { onlineUsers, isUserOnline };
};
