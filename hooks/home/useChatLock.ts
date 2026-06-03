import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useFriendsStore } from '@/store/useFriendsStore';

export const useChatLock = () => {
    const router = useRouter();
    const [lockModalVisible, setLockModalVisible] = useState(false);
    const [lockModalMode, setLockModalMode] = useState<'verify' | 'setup'>('verify');
    const [lockModalTask, setLockModalTask] = useState<'open' | 'unlock'>('open');
    const [pendingLockedFriend, setPendingLockedFriend] = useState<any>(null);

    const requireLockSetup = useCallback((friend: any) => {
        setPendingLockedFriend(friend);
        setLockModalMode('setup');
        setLockModalVisible(true);
    }, []);

    const requireLockVerify = useCallback((friend: any) => {
        setPendingLockedFriend(friend);
        setLockModalMode('verify');
        setLockModalTask('unlock');
        setLockModalVisible(true);
    }, []);

    const openLockedChat = useCallback((friend: any) => {
        setPendingLockedFriend(friend);
        setLockModalMode('verify');
        setLockModalTask('open');
        setLockModalVisible(true);
    }, []);

    const handleLockModalSuccess = useCallback(async () => {
        setLockModalVisible(false);
        if (lockModalMode === 'setup' && pendingLockedFriend) {
            const { lockChat } = useFriendsStore.getState();
            await lockChat(pendingLockedFriend.id);
            Alert.alert("Chat Locked", "This chat is now moved to the Locked tab.");
        } else if (lockModalMode === 'verify' && pendingLockedFriend) {
            if (lockModalTask === 'unlock') {
                const { unlockChat } = useFriendsStore.getState();
                await unlockChat(pendingLockedFriend.id);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert("Chat Unlocked", "This chat is now visible in the main list.");
            } else {
                const f = pendingLockedFriend;
                useFriendsStore.getState().clearUnreadCount(f.id);
                const nameParam = encodeURIComponent(f.name || 'Chat');
                const groupParam = f.isGroup ? 'true' : 'false';
                const imageParam = encodeURIComponent(f.img || '');
                router.push(`/chat/${f.id}?name=${nameParam}&isGroup=${groupParam}&image=${imageParam}` as any);
            }
        }
        setPendingLockedFriend(null);
    }, [lockModalMode, pendingLockedFriend, lockModalTask, router]);

    return {
        lockModalVisible,
        setLockModalVisible,
        lockModalMode,
        lockModalTask,
        pendingLockedFriend,
        setPendingLockedFriend,
        requireLockSetup,
        requireLockVerify,
        openLockedChat,
        handleLockModalSuccess
    };
};
