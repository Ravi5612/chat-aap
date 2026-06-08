import { useCallback, MutableRefObject } from 'react';
import { supabase } from '@/lib/supabase';
import { displayOutgoingCall, cancelOutgoingCall } from '@/utils/notifeeCalling';
import { RTCSessionDescription } from './webrtcModule';

export const useWebRTCCallActions = (
    currentUser: any,
    friend: any,
    setupMedia: Function,
    createPeerConnection: Function,
    incomingOffer: any,
    onAcceptCallRef: MutableRefObject<Function>,
    onEndCallRef: MutableRefObject<Function>,
    channelRef: MutableRefObject<any>,
    callTypeRef: MutableRefObject<string>
) => {
    const startCall = useCallback(async () => {
        try {
            const stream = await setupMedia();
            if (!stream) return;
            const pc = createPeerConnection(stream);
            if (!pc) return;

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const signalChannelName = `calls-signal-${friend.id}`;
            if (__DEV__) console.log('[DEBUG] WebRTC: Sending offer to:', signalChannelName);
            
            // Show outgoing call notification
            displayOutgoingCall(friend?.username || 'Someone');

            // Trigger offline wake-up via Edge Function
            supabase.functions.invoke('call-signal', {
                body: {
                    recipient_id: friend.id,
                    caller_name: currentUser?.username || 'Someone',
                    channel_name: signalChannelName
                }
            }).catch(err => {
                if (__DEV__) console.error("Failed to wake up offline user", err);
            });

            const personalChannel = supabase.channel(signalChannelName);
            let timeoutId: any;
            
            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                supabase.removeChannel(personalChannel).catch(() => {});
            };

            personalChannel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    try {
                        await personalChannel.send({
                            type: 'broadcast',
                            event: 'signal',
                            payload: {
                                type: 'offer',
                                sdp: offer,
                                call_type: callTypeRef.current,
                                caller_id: currentUser.id
                            }
                        });
                    } catch (e) {
                        if (__DEV__) console.warn('Failed to send WebRTC offer', e);
                    }
                    cleanup();
                }
            });
            timeoutId = setTimeout(cleanup, 8000);
        } catch (err: any) {
            if (__DEV__) console.error("Failed to start call:", err);
        }
    }, [currentUser?.id, friend?.id, setupMedia, createPeerConnection, callTypeRef]);

    const acceptCall = useCallback(async () => {
        try {
            const stream = await setupMedia();
            if (!stream) return;
            const pc = createPeerConnection(stream);
            if (!pc) return;

            await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'signal',
                    payload: { type: 'answer', sdp: answer }
                });
            }
            cancelOutgoingCall();
            onAcceptCallRef.current();
        } catch (err: any) {
            if (__DEV__) console.error("Failed to accept call:", err);
        }
    }, [incomingOffer, setupMedia, createPeerConnection, channelRef, onAcceptCallRef]);

    const endCall = useCallback(() => {
        if (channelRef.current) {
            channelRef.current.send({ type: 'broadcast', event: 'signal', payload: { type: 'end' } });
        }
        cancelOutgoingCall();
        onEndCallRef.current();
    }, [channelRef, onEndCallRef]);

    return { startCall, acceptCall, endCall };
};
