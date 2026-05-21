import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

const VALID_NOTIFICATION_TYPES = [
    'friend_request',
    'friend_accepted',
    'friend_cancelled',
    'system',
    'status_reply'
];

export interface Notification {
    id: string;
    type: string;
    is_read: boolean;
    user_id: string;
    [key: string]: any;
}

export const useNotifications = () => {
    const { user: currentUser } = useAuthStore();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        if (!currentUser?.id) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', currentUser.id)
                .in('type', VALID_NOTIFICATION_TYPES)
                .order('created_at', { ascending: false });

            if (!error) {
                setNotifications(data || []);
            }
        } catch (e) {
            if (__DEV__) console.error("Error fetching notifications:", e);
        } finally {
            setLoading(false);
        }
    }, [currentUser?.id]);

    useEffect(() => {
        if (!currentUser?.id) return;
        
        fetchNotifications();

        const channel = supabase
            .channel(`notifications-realtime-${currentUser.id}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'notifications',
                filter: `user_id=eq.${currentUser.id}`
            }, (payload) => {
                if (!VALID_NOTIFICATION_TYPES.includes(payload.new.type)) return;
                setNotifications(prev => [payload.new as Notification, ...prev]);
            })
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'notifications',
                filter: `user_id=eq.${currentUser.id}`
            }, (payload) => {
                setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new as Notification : n));
            })
            .on('postgres_changes', { 
                event: 'DELETE', 
                schema: 'public', 
                table: 'notifications',
                // Filter doesn't always work on DELETE depending on Replica Identity, but we can try
                filter: `user_id=eq.${currentUser.id}`
            }, (payload) => {
                setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id, fetchNotifications]);

    const markAsRead = useCallback(async (notificationId: string) => {
        try {
            const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
            if (error) throw error;
            setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
        } catch (error) { 
            if (__DEV__) console.error("Error marking notification as read:", error);
        }
    }, []);

    const getCounts = useMemo(() => {
        return {
            total: notifications.length,
            unread: notifications.filter(n => !n.is_read).length,
            friendRequest: notifications.filter(n => n.type === 'friend_request' || n.type === 'friend_accepted').length
        };
    }, [notifications]);

    return { notifications, loading, markAsRead, getCounts, refresh: fetchNotifications };
};
