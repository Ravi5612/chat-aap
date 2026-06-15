import { useState, useRef, useEffect, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useFriendsStore } from '@/store/useFriendsStore';

export function useStatusControls(
    statuses: any[],
    currentIndex: number,
    setCurrentIndex: (idx: number) => void,
    loading: boolean,
    userId: string | undefined,
    router: any,
    currentUser: any
) {
    const [paused, setPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isReplying, setIsReplying] = useState(false);
    const touchStartRef = useRef<number>(0);
    const STORY_DURATION = 5000;

    const getActiveUsersList = useCallback(() => {
        const friendsStore = useFriendsStore.getState();
        const myActiveStatuses = friendsStore.myStatuses?.active || [];
        const statusInfo = friendsStore.statusInfo || {};
        const friendsWithStatus = friendsStore.combinedItems.filter((f: any) => (statusInfo[f.id]?.count || 0) > 0);
        
        const allUsersList: string[] = [];
        if (myActiveStatuses.length > 0 && currentUser) {
            allUsersList.push(currentUser.id);
        }
        friendsWithStatus.forEach((f: any) => {
            if (!allUsersList.includes(f.id)) {
                allUsersList.push(f.id);
            }
        });
        return allUsersList;
    }, [currentUser]);

    const getNextFriendWithStatus = useCallback(() => {
        const allUsers = getActiveUsersList();
        const curPos = allUsers.indexOf(userId as string);
        if (curPos !== -1 && curPos < allUsers.length - 1) {
            return allUsers[curPos + 1];
        }
        return null;
    }, [getActiveUsersList, userId]);

    const getPrevFriendWithStatus = useCallback(() => {
        const allUsers = getActiveUsersList();
        const curPos = allUsers.indexOf(userId as string);
        if (curPos > 0) {
            return allUsers[curPos - 1];
        }
        return null;
    }, [getActiveUsersList, userId]);

    const handleNext = useCallback(() => {
        if (currentIndex < statuses.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            const nextUserId = getNextFriendWithStatus();
            if (nextUserId) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.setParams({ userId: nextUserId, initialIndex: '0' });
            } else {
                router.back();
            }
        }
    }, [currentIndex, statuses.length, getNextFriendWithStatus, router]);

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        } else {
            const prevUserId = getPrevFriendWithStatus();
            if (prevUserId) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.setParams({ userId: prevUserId, initialIndex: '0' });
            }
        }
    }, [currentIndex, getPrevFriendWithStatus, router]);

    useEffect(() => {
        if (loading || statuses.length === 0 || paused || isReplying) return;

        const currentStatus = statuses[currentIndex];
        if (currentStatus?.media_type === 'video') return;

        setProgress(0);
        const duration = STORY_DURATION;
        let startTime = Date.now();
        let elapsed = 0;

        const interval = setInterval(() => {
            if (paused) {
                startTime = Date.now() - elapsed;
                return;
            }

            elapsed = Date.now() - startTime;
            const newProgress = Math.min(1, elapsed / duration);
            setProgress(newProgress);

            if (newProgress >= 1) {
                clearInterval(interval);
                handleNext();
            }
        }, 30);

        return () => clearInterval(interval);
    }, [currentIndex, statuses, loading, paused, isReplying, handleNext]);

    const handleSkipToNextUser = useCallback(() => {
        const nextUserId = getNextFriendWithStatus();
        if (nextUserId) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.setParams({ userId: nextUserId, initialIndex: '0' });
        } else {
            router.back();
        }
    }, [getNextFriendWithStatus, router]);

    const handleSkipToPrevUser = useCallback(() => {
        const prevUserId = getPrevFriendWithStatus();
        if (prevUserId) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.setParams({ userId: prevUserId, initialIndex: '0' });
        }
    }, [getPrevFriendWithStatus, router]);

    return {
        paused, setPaused,
        progress, setProgress,
        isReplying, setIsReplying,
        touchStartRef,
        handleNext, handlePrev,
        handleSkipToNextUser, handleSkipToPrevUser
    };
}
