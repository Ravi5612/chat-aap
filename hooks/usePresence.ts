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

        const updateStatus = async (online: boolean) => {
            try {
                await supabase
                    .from('profiles')
                    .update({
                        is_online: online
                    })
                    .eq('id', myUserId);
            } catch (err) {
                console.error('Error updating status:', err);
            }
        };

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                setOnlineUsers(state);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ online_at: new Date().toISOString() });
                    await updateStatus(true);
                }
            });

        return () => {
            updateStatus(false);
            supabase.removeChannel(channel);
        };
    }, [myUserId]);

    const isUserOnline = (userId: string) => {
        return !!onlineUsers[userId];
    };

    return { onlineUsers, isUserOnline };
};
