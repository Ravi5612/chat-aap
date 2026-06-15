import { useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Network from 'expo-network';
import { useFriendsStore } from '@/store/useFriendsStore';
import { useCallStore } from '@/store/useCallStore';
import { cancelOutgoingCall } from '@/utils/notifeeCalling';

import { logCallHistory } from '@/services/calls/callLoggingService';
import { sendSignalReliably, sendCallPushNotification } from '@/services/calls/callSignalingService';

import { useCallAudio } from './calls/useCallAudio';
import { useCallTimeouts } from './calls/useCallTimeouts';
import { useCallNotifications } from './calls/useCallNotifications';
import { useCallSignalingListener } from './calls/useCallSignalingListener';

export const useCallManager = (currentUser: any, combinedItems: any[], isListener = true, profile: any = null) => {
    const callSession = useCallStore(state => state.callSession);
    const setCallSession = useCallStore(state => state.setCallSession);
    const setCallActive = useCallStore(state => state.setCallActive);
    const setCallEnded = useCallStore(state => state.setCallEnded);
    
    const combinedItemsRef = useRef(combinedItems);
    useEffect(() => { combinedItemsRef.current = combinedItems; }, [combinedItems]);

    const sessionRef = useRef(callSession);
    useEffect(() => { sessionRef.current = callSession; }, [callSession]);

    // Sub-hooks
    useCallAudio(callSession, profile);

    const safeLogCallHistory = useCallback((status: any, overrideSession?: any) => {
        logCallHistory(status, overrideSession || sessionRef.current, currentUser);
    }, [currentUser]);

    useCallTimeouts(callSession, safeLogCallHistory, setCallEnded);
    useCallNotifications(callSession);
    
    useCallSignalingListener(
        currentUser, 
        isListener, 
        sessionRef, 
        combinedItemsRef, 
        sendSignalReliably, 
        safeLogCallHistory
    );

    const handleStartCall = async (friend: any, type: 'audio' | 'video' = 'video', isGroup: boolean = false, autoMinimize: boolean = false) => {
        const networkState = await Network.getNetworkStateAsync();
        // isInternetReachable can be null on some devices, so we primarily check isConnected
        if (!networkState.isConnected) {
            Alert.alert('No Internet', 'Please check your internet connection and try calling again.');
            return;
        }

        if (__DEV__) console.log('[CALL_ACTION] Starting call to:', friend.name, 'Type:', type, 'IsGroup:', isGroup);
        
        setCallSession({
            status: 'outgoing',
            type,
            friend,
            isGroup,
            autoMinimize
        });

        const offerPayload = {
            type: 'offer',
            call_type: type,
            caller_id: currentUser.id,
            is_group: isGroup,
            group_id: isGroup ? friend.id : null
        };

        if (isGroup) {
            const { groups } = useFriendsStore.getState();
            const group = groups.find(g => g.group.id === friend.id);
            const members = group?.members || [];
            
            if (members.length > 0) {
                if (__DEV__) console.log(`[CALL_ACTION] Notifying ${members.length - 1} group members`);
                members.forEach((m: any) => {
                    if (m.user_id !== currentUser.id) {
                        sendSignalReliably(m.user_id, offerPayload);
                        sendCallPushNotification(m.user_id, currentUser.username, 'group', currentUser.id);
                    }
                });
            }
        } else {
            sendSignalReliably(friend.id, offerPayload);
            sendCallPushNotification(friend.id, currentUser.username, 'private', currentUser.id);
        }
    };

    const endCall = () => {
        if (__DEV__) console.log('[CALL_ACTION] Ending call locally');
        cancelOutgoingCall();
        
        const currentStatus = sessionRef.current?.status;
        if (currentStatus === 'active') {
            safeLogCallHistory('completed');
        } else if (currentStatus === 'outgoing' || currentStatus === 'ringing') {
            safeLogCallHistory('cancelled');
        }

        const endType = callSession?.status === 'incoming' ? 'rejected' : 'end';
        if (callSession?.friend?.id) {
            sendSignalReliably(callSession.friend.id, { type: endType });
        }
        setCallSession(null);
    };

    return {
        callSession,
        handleStartCall,
        setCallActive,
        endCall
    };
};
