import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useFriendsStore } from '@/store/useFriendsStore';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useGlobalRealtime } from '@/hooks/useGlobalRealtime';
import { useCallManager } from '@/hooks/useCallManager';
import { useInitialPermissions } from '@/hooks/useInitialPermissions';
import CallScreen from '@/components/chat/CallScreen';

import { useNotificationStore } from '@/store/useNotificationStore';
import { useDbStore } from '@/store/useDbStore';
import InAppNotification from '@/components/ui/InAppNotification';

export const BackgroundServices = () => {
    const session = useAuthStore(state => state.session);
    const combinedItems = useFriendsStore(state => state.combinedItems);
    const { currentNotification, clearNotification } = useNotificationStore();
    const initializeDb = useDbStore(state => state.initialize);

    useEffect(() => {
        if (session?.user) {
            initializeDb();
        }
    }, [session?.user]);
    
    // 1. Permissions
    useInitialPermissions();

    // 2. Global Services
    usePushNotifications(session?.user?.id || null);
    useGlobalRealtime(session?.user?.id || null);

    // 3. Call Management
    const memoizedFriends = React.useMemo(() => combinedItems || [], [combinedItems?.length]);
    const profile = useAuthStore(state => state.profile);
    const { 
        callSession, 
        setCallActive, 
        endCall 
    } = useCallManager(session?.user, memoizedFriends, true, profile);

    if (!session?.user) return null;

    return (
        <>
            <InAppNotification 
                notification={currentNotification} 
                onClose={clearNotification} 
            />
            <CallScreen
                visible={!!callSession}
                callState={callSession?.status}
                onEndCall={endCall}
                onAcceptCall={setCallActive}
                currentUser={session?.user}
                callType={callSession?.type || 'video'}
                friend={callSession?.friend || {}}
                offer={callSession?.offer}
            />
        </>
    );
};
