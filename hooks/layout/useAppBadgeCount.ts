import { useEffect } from 'react';
import notifee from '@notifee/react-native';
import { useFriendsStore } from '@/store/useFriendsStore';
import { useDbNotifications } from '@/hooks/useDbNotifications';

export function useAppBadgeCount() {
    const friends = useFriendsStore((state) => state.friends);
    const { unreadCount: unreadNotifs } = useDbNotifications();

    useEffect(() => {
        const totalUnreadChats = friends.reduce((sum, f) => sum + (f.unreadCount || 0), 0);
        const totalBadgeCount = totalUnreadChats + (unreadNotifs || 0);

        notifee.setBadgeCount(totalBadgeCount).catch(err => {
            if (__DEV__) console.warn('Failed to set badge count:', err);
        });
    }, [friends, unreadNotifs]);
}
