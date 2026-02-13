import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
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
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
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

    // 1. Signaling Setup
    const setupSignaling = useCallback(() => {
        if (!currentUser || !friend) return;
        const ids = [currentUser.id, friend.id].sort();
        const sharedChannelName = `call-${ids[0]}-${ids[1]}`;

        const channel = supabase.channel(sharedChannelName);
        channelRef.current = channel;

        channel
            .on('broadcast', { event: 'signal' }, async ({ payload }) => {
                try {
                    if (payload.type === 'answer') {
                        if (peerConnection.current) {
                            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                            onAcceptCall();
                        }
                    } else if (payload.type === 'ice-candidate') {
                        if (payload.candidate && peerConnection.current) {
                            await peerConnection.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
                        }
                    } else if (payload.type === 'end') {
                        onEndCall();
                    }
                } catch (err) {
                    console.error("Signaling error:", err);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id, friend?.id, onAcceptCall, onEndCall]);

    // 2. Media Setup
    const setupMedia = useCallback(async (mode = facingMode) => {
        if (!isWebRTCSupported) {
            console.warn("WebRTC setup skipped: Not supported in this environment");
            return null;
        }

        try {
            const constraints: any = {
                video: callType === 'video' ? {
                    facingMode: mode,
                    frameRate: 30,
                } : false,
                audio: true
            };

            const stream = await mediaDevices.getUserMedia(constraints) as MediaStream;
            localStreamRef.current = stream;
            setLocalStream(stream);
            return stream;
        } catch (err) {
            console.error("Media setup failed:", err);
            // Fallback for video fail -> audio only
            if (callType === 'video') {
                try {
                    const audioStream = await mediaDevices.getUserMedia({ video: false, audio: true }) as MediaStream;
                    localStreamRef.current = audioStream;
                    setLocalStream(audioStream);
                    setIsVideoOff(true);
                    return audioStream;
                } catch (e) {
                    console.error("Audio fallback failed:", e);
                    return null;
                }
            }
            return null;
        }
    }, [callType, facingMode]);

    // 3. Peer Connection Setup
    const createPeerConnection = useCallback((stream: MediaStream) => {
        if (!stream || !isWebRTCSupported) return null;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnection.current = pc;

        (stream as any).getTracks().forEach((track: any) => {
            pc.addTrack(track, stream);
        });

        (pc as any).addEventListener('addstream', (event: any) => {
            setRemoteStream(event.stream);
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

            const personalChannel = supabase.channel(`calls:${friend.id}`);
            personalChannel.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    personalChannel.send({
                        type: 'broadcast',
                        event: 'signal',
                        payload: {
                            type: 'offer',
                            sdp: offer,
                            call_type: callType,
                            caller_id: currentUser.id
                        }
                    });
                    setTimeout(() => supabase.removeChannel(personalChannel), 3000);
                }
            });
        } catch (err: any) {
            console.error("Failed to start call:", err);
        }
    }, [currentUser?.id, friend?.id, callType, setupMedia, createPeerConnection]);

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
            onAcceptCall();
        } catch (err: any) {
            console.error("Failed to accept call:", err);
        }
    }, [incomingOffer, setupMedia, createPeerConnection, onAcceptCall]);

    const endCall = useCallback(() => {
        if (channelRef.current) {
            channelRef.current.send({ type: 'broadcast', event: 'signal', payload: { type: 'end' } });
        }
        onEndCall();
    }, [onEndCall]);

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
        setupSignaling();
        if (callState === 'outgoing') startCall();

        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
            }
            if (peerConnection.current) {
                peerConnection.current.close();
            }
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, []);

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
