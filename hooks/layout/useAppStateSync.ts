import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '@/store/useAuthStore';

export const useAppStateSync = () => {
    const lastAppStateTime = useRef(0);

    useEffect(() => {
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            const now = Date.now();
            if (now - lastAppStateTime.current < 2000) return;
            lastAppStateTime.current = now;
            
            const { session, syncOnlineStatus } = useAuthStore.getState();
            if (session?.user?.id) {
                if (nextAppState === 'active') {
                    syncOnlineStatus(true);
                } else if (nextAppState === 'background' || nextAppState === 'inactive') {
                    syncOnlineStatus(false);
                }
            }
        };

        const appStateSub = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            appStateSub.remove();
        };
    }, []);
};
