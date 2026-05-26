import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { displayOutgoingCall, cancelOutgoingCall } from '../utils/notifeeCalling';
let WebRTCModule: any = {};
try {
    // We use require instead of import to prevent top-level crash in Expo Go
    WebRTCModule = require('react-native-webrtc');
} catch (e) {
    console.warn("WebRTC native module not found. This is expected in Expo Go.");
}

const {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    mediaDevices,
    MediaStream,
} = WebRTCModule;

// Check if WebRTC is available
const isWebRTCSupported = !!RTCPeerConnection;

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
    ],
};

export const useWebRTC = ({
    currentUser,
    friend,
    callType,
    callState,
    onAcceptCall,
    onEndCall,
    incomingOffer
}: any) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [connectionStatus, setConnectionStatus] = useState('new');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
    const [facingMode, setFacingMode] = useState('user');

    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const channelRef = useRef<any>(null);

    // Refs for stable state without re-triggering effects
    const onAcceptCallRef = useRef(onAcceptCall);
    const onEndCallRef = useRef(onEndCall);
    const callStateRef = useRef(callState);
    const callTypeRef = useRef(callType);
    const facingModeRef = useRef(facingMode);

    useEffect(() => {
        onAcceptCallRef.current = onAcceptCall;
        onEndCallRef.current = onEndCall;
        callStateRef.current = callState;
        callTypeRef.current = callType;
        facingModeRef.current = facingMode;
    }, [onAcceptCall, onEndCall, callState, callType, facingMode]);

    // 1. Signaling Setup
    const setupSignaling = useCallback(() => {
        if (!currentUser || !friend) return;
        const ids = [currentUser.id, friend.id].sort();
        // Stable shared channel for this specific pair of users
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
    }, [currentUser?.id, friend?.id]);

    // 2. Media Setup
    const setupMedia = useCallback(async () => {
        if (!isWebRTCSupported) {
            if (__DEV__) console.warn("WebRTC setup skipped: Not supported in this environment");
            return null;
        }

        try {
            const constraints: any = {
                video: callTypeRef.current === 'video' ? {
                    facingMode: facingModeRef.current,
                    frameRate: 30,
                } : false,
                audio: true
            };

            const stream = await mediaDevices.getUserMedia(constraints) as MediaStream;
            localStreamRef.current = stream;
            setLocalStream(stream);
            return stream;
        } catch (err) {
            if (__DEV__) console.error("Media setup failed:", err);
            // Fallback for video fail -> audio only
            if (callTypeRef.current === 'video') {
                try {
                    const audioStream = await mediaDevices.getUserMedia({ video: false, audio: true }) as MediaStream;
                    localStreamRef.current = audioStream;
                    setLocalStream(audioStream);
                    setIsVideoOff(true);
                    return audioStream;
                } catch (e) {
                    if (__DEV__) console.error("Audio fallback failed:", e);
                    return null;
                }
            }
            return null;
        }
    }, []);

    // 3. Peer Connection Setup
    const createPeerConnection = useCallback((stream: MediaStream) => {
        if (!stream || !isWebRTCSupported) return null;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnection.current = pc;

        (stream as any).getTracks().forEach((track: any) => {
            pc.addTrack(track, stream);
        });

        // Use standard 'track' event instead of deprecated 'addstream'
        (pc as any).addEventListener('track', (event: any) => {
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0]);
            }
        });

        (pc as any).addEventListener('icecandidate', (event: any) => {
            if (event.candidate && channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'signal',
                    payload: { type: 'ice-candidate', candidate: event.candidate }
                });
            }
        });

        (pc as any).addEventListener('connectionstatechange', () => {
            setConnectionStatus(pc.connectionState);
        });

        return pc;
    }, []);

    // 4. Call Actions
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
    }, [currentUser?.id, friend?.id, setupMedia, createPeerConnection]);

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
    }, [incomingOffer, setupMedia, createPeerConnection]);

    const endCall = useCallback(() => {
        if (channelRef.current) {
            channelRef.current.send({ type: 'broadcast', event: 'signal', payload: { type: 'end' } });
        }
        cancelOutgoingCall();
        onEndCallRef.current();
    }, []);

    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    }, []);

    const toggleVideo = useCallback(() => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    }, []);

    const switchCamera = useCallback(async () => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach((track: any) => track._switchCamera());
        }
    }, []);

    // Lifecycle
    useEffect(() => {
        const cleanupSignaling = setupSignaling();
        
        // Use the ref to check initial call state without adding to dependency array
        if (callStateRef.current === 'outgoing') {
            startCall();
        }

        return () => {
            if (cleanupSignaling) cleanupSignaling();
            
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
            }
            if (peerConnection.current) {
                try {
                    const senders = (peerConnection.current as any).getSenders();
                    senders.forEach((sender: any) => (peerConnection.current as any).removeTrack(sender));
                } catch (e) {
                    if (__DEV__) console.warn('Error removing tracks:', e);
                }
                peerConnection.current.close();
                peerConnection.current = null;
            }
            // channelRef cleanup is handled by cleanupSignaling return
        };
    }, [setupSignaling, startCall]);

    return {
        localStream,
        remoteStream,
        connectionStatus,
        isMuted,
        isVideoOff,
        facingMode,
        acceptCall,
        endCall,
        toggleMute,
        toggleVideo,
        switchCamera
    };
};
