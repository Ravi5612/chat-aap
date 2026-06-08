import { useCallback, useRef, MutableRefObject } from 'react';
import { supabase } from '@/lib/supabase';
import { RTCSessionDescription, RTCIceCandidate } from './webrtcModule';

export const useWebRTCSignaling = (
    currentUser: any,
    friend: any,
    peerConnection: MutableRefObject<any>,
    onAcceptCallRef: MutableRefObject<Function>,
    onEndCallRef: MutableRefObject<Function>
) => {
    const channelRef = useRef<any>(null);

    const setupSignaling = useCallback(() => {
        if (!currentUser || !friend) return;
        const ids = [currentUser.id, friend.id].sort();
        const sharedChannelName = `webrtc-sig-${ids[0].substring(0, 8)}-${ids[1].substring(0, 8)}`;

        if (__DEV__) console.log('[DEBUG] WebRTC: Subscribing to signaling:', sharedChannelName);
        const channel = supabase.channel(sharedChannelName);
        channelRef.current = channel;

        channel
            .on('broadcast', { event: 'signal' }, async ({ payload }) => {
                if (__DEV__) console.log('[DEBUG] WebRTC: Received signal:', payload.type);
                try {
                    if (payload.type === 'answer') {
                        if (peerConnection.current) {
                            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                            onAcceptCallRef.current();
                        }
                    } else if (payload.type === 'ice-candidate') {
                        if (payload.candidate && peerConnection.current) {
                            await peerConnection.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
                        }
                    } else if (payload.type === 'end') {
                        onEndCallRef.current();
                    }
                } catch (err) {
                    if (__DEV__) console.error("[ERROR] WebRTC Signaling:", err);
                }
            })
            .subscribe((status) => {
                if (__DEV__) console.log('[DEBUG] WebRTC: Signaling Status:', status);
            });

        return () => {
            if (__DEV__) console.log('[DEBUG] WebRTC: Cleaning up signaling channel');
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id, friend?.id, onAcceptCallRef, onEndCallRef, peerConnection]);

    return { setupSignaling, channelRef };
};
