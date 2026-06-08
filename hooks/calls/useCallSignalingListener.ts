import { useEffect, MutableRefObject } from 'react';
import { supabase } from '@/lib/supabase';
import { useCallStore } from '@/store/useCallStore';

export const useCallSignalingListener = (
    currentUser: any,
    isListener: boolean,
    sessionRef: MutableRefObject<any>,
    combinedItemsRef: MutableRefObject<any[]>,
    sendSignalReliably: Function,
    logCallHistory: Function
) => {
    useEffect(() => {
        if (!currentUser?.id || !isListener) return;

        const channelName = `calls-signal-${currentUser.id}`;
        const channel = supabase.channel(channelName);

        channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
            if (__DEV__) console.log('[CALL_ACTION] Signal received:', payload.type, 'from:', payload.caller_id);
            if (payload.type === 'offer') {
                // If already in a call, send BUSY signal back to the caller
                if (sessionRef.current) {
                    if (__DEV__) console.log('[CALL_ACTION] Already in a call, sending BUSY to:', payload.caller_id);
                    sendSignalReliably(payload.caller_id, { type: 'busy', receiver_id: currentUser.id });
                    return;
                }

                // Use the ref to prevent stale closures and avoid recreating the channel
                const caller = combinedItemsRef.current.find((f: any) => f.id === (payload.is_group ? payload.group_id : payload.caller_id)) || { id: payload.caller_id, name: 'Unknown' };
                if (__DEV__) console.log('[CALL_ACTION] Incoming call offer from:', caller.name);
                
                useCallStore.getState().setCallSession({
                    status: 'incoming',
                    type: payload.call_type,
                    offer: payload.sdp,
                    friend: caller,
                    isGroup: payload.is_group
                });

                // Immediately send back a 'ringing' signal so caller knows we got it
                sendSignalReliably(payload.caller_id, { type: 'ringing', receiver_id: currentUser.id });
            } else if (payload.type === 'ringing') {
                if (__DEV__) console.log('[CALL_ACTION] Remote user is ringing');
                useCallStore.getState().setCallRinging();
            } else if (payload.type === 'accepted') {
                if (__DEV__) console.log('[CALL_ACTION] Call accepted by remote user');
                useCallStore.getState().setCallActive();
            } else if (payload.type === 'busy') {
                if (__DEV__) console.log('[CALL_ACTION] Remote user is busy');
                if (!sessionRef.current?.isGroup) {
                    logCallHistory('rejected');
                    useCallStore.getState().setCallEnded('User is busy on another call');
                }
            } else if (payload.type === 'rejected') {
                if (__DEV__) console.log('[CALL_ACTION] Call rejected by remote user');
                if (!sessionRef.current?.isGroup) {
                    logCallHistory('rejected');
                    useCallStore.getState().setCallEnded('Call declined');
                } else {
                    useCallStore.getState().setCallSession(null);
                }
            } else if (payload.type === 'end') {
                if (__DEV__) console.log('[CALL_ACTION] Call ended by remote user signal');
                if (sessionRef.current?.status === 'active') {
                    logCallHistory('completed');
                } else {
                    logCallHistory('missed');
                }
                useCallStore.getState().setCallSession(null);
            }
        });

        channel.subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id, isListener, sendSignalReliably, logCallHistory, sessionRef, combinedItemsRef]);
};
