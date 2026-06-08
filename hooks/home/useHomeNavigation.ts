import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { useFriendsStore } from '@/store/useFriendsStore';

export const useHomeNavigation = (openLockedChat: (friend: any) => void) => {
    const router = useRouter();

    const handleSelectFriend = useCallback((friend: any) => {
        if (!friend?.id) return;
        if (friend.isLocked) {
            openLockedChat(friend);
            return;
        }
        try {
            useFriendsStore.getState().clearUnreadCount(friend.id);
            const nameParam = encodeURIComponent(friend.name || 'Chat');
            const groupParam = friend.isGroup ? 'true' : 'false';
            const imageStr = typeof friend.img === 'object' && friend.img?.uri ? friend.img.uri : '';
            const imageParam = encodeURIComponent(imageStr);
            const url = `/chat/${friend.id}?name=${nameParam}&isGroup=${groupParam}&image=${imageParam}`;
            setTimeout(() => { router.push(url as any); }, 10);
        } catch (err: any) {
            Alert.alert("Nav Error", err.message);
        }
    }, [router, openLockedChat]);

    return { handleSelectFriend };
};
