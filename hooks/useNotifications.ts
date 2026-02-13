import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const VALID_NOTIFICATION_TYPES = [
    'friend_request',
    'friend_accepted',
    'friend_cancelled',
    'system',
    'status_reply'
];

export const useNotifications = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();

        const channel = supabase
            .channel('notifications-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
                if (!VALID_NOTIFICATION_TYPES.includes(payload.new.type)) return;
                setNotifications(prev => [payload.new, ...prev]);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, (payload) => {
                setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notifications' }, (payload) => {
                setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .in('type', VALID_NOTIFICATION_TYPES)
                .order('created_at', { ascending: false });

            if (!error) {
                setNotifications(data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId: string) => {
        try {
            await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
            setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
        } catch (error) { }
    };

    const getCounts = () => ({
        total: notifications.length,
        unread: notifications.filter(n => !n.is_read).length,
        friendRequest: notifications.filter(n => n.type === 'friend_request' || n.type === 'friend_accepted').length
    });

    return { notifications, loading, markAsRead, getCounts, refresh: fetchNotifications };
};
