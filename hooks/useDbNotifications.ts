import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const useDbNotifications = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let channel: any;

        const init = async () => {
            const { useAuthStore } = require('@/store/useAuthStore');
            const user = useAuthStore.getState().user;
            if (!user) return;

            // Wait 3 seconds before fetching to avoid slowing down app startup
            setTimeout(async () => {
                await loadNotifications(user.id);

                // Realtime listener - nai notification aate hi list update ho
                channel = supabase
                    .channel(`db-notifications-${user.id}`)
                    .on('postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'notifications',
                            filter: `user_id=eq.${user.id}`
                        },
                        () => {
                            loadNotifications(user.id);
                        }
                    )
                    .subscribe();
            }, 3000);
        };

        init();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    const loadNotifications = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select(`
                    *,
                    sender:profiles!notifications_sender_id_fkey(
                        id,
                        username,
                        avatar_url
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setNotifications(data || []);
        } catch (err) {
            console.error('useDbNotifications error:', err);
        } finally {
            setLoading(false);
        }
    };

    const markAllRead = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const refresh = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await loadNotifications(user.id);
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return { notifications, loading, unreadCount, markAllRead, refresh };
};
