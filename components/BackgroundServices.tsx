import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useFriendsStore } from '@/store/useFriendsStore';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useGlobalRealtime } from '@/hooks/useGlobalRealtime';
import { useCallManager } from '@/hooks/useCallManager';
import { useInitialPermissions } from '@/hooks/useInitialPermissions';
import CallScreen from '@/components/chat/CallScreen';

export const BackgroundServices = () => {
    const session = useAuthStore(state => state.session);
    const combinedItems = useFriendsStore(state => state.combinedItems);
    
    // 1. Permissions
    useInitialPermissions();

    // 2. Global Services
    usePushNotifications(session?.user?.id || null);
    useGlobalRealtime(session?.user?.id || null);

    // 3. Call Management
    const memoizedFriends = React.useMemo(() => combinedItems || [], [combinedItems?.length]);
    const { 
        callSession, 
        setCallActive, 
        endCall 
    } = useCallManager(session?.user, memoizedFriends);

    if (!session?.user) return null;

    return (
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
    );
};
