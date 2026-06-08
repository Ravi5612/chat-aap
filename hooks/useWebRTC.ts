import { useEffect, useRef, useState } from 'react';
import { useWebRTCSignaling } from './webrtc/useWebRTCSignaling';
import { useWebRTCMedia } from './webrtc/useWebRTCMedia';
import { useWebRTCPeerConnection } from './webrtc/useWebRTCPeerConnection';
import { useWebRTCCallActions } from './webrtc/useWebRTCCallActions';

export const useWebRTC = ({
    currentUser,
    friend,
    callType,
    callState,
    onAcceptCall,
    onEndCall,
    incomingOffer
}: any) => {
    const peerConnection = useRef<any>(null);

    // Stable refs to avoid unnecessary re-renders in callbacks
    const onAcceptCallRef = useRef(onAcceptCall);
    const onEndCallRef = useRef(onEndCall);
    const callStateRef = useRef(callState);
    const callTypeRef = useRef(callType);
    
    // Facing mode state just like before
    const [facingMode, setFacingMode] = useState('user');
    const facingModeRef = useRef(facingMode);

    useEffect(() => {
        onAcceptCallRef.current = onAcceptCall;
        onEndCallRef.current = onEndCall;
        callStateRef.current = callState;
        callTypeRef.current = callType;
        facingModeRef.current = facingMode;
    }, [onAcceptCall, onEndCall, callState, callType, facingMode]);

    // 1. Signaling
    const { setupSignaling, channelRef } = useWebRTCSignaling(
        currentUser,
        friend,
        peerConnection,
        onAcceptCallRef,
        onEndCallRef
    );

    // 2. Peer Connection
    const { remoteStream, connectionStatus, createPeerConnection } = useWebRTCPeerConnection(
        channelRef,
        peerConnection
    );

    // 3. Media
    const {
        localStream,
        localStreamRef,
        isMuted,
        isVideoOff,
        setupMedia,
        toggleMute,
        toggleVideo,
        switchCamera
    } = useWebRTCMedia(callTypeRef, facingModeRef);

    // 4. Call Actions
    const { startCall, acceptCall, endCall } = useWebRTCCallActions(
        currentUser,
        friend,
        setupMedia,
        createPeerConnection,
        incomingOffer,
        onAcceptCallRef,
        onEndCallRef,
        channelRef,
        callTypeRef
    );

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
                localStreamRef.current.getTracks().forEach((t: any) => t.stop());
            }
            if (peerConnection.current) {
                try {
                    const senders = peerConnection.current.getSenders();
                    senders.forEach((sender: any) => peerConnection.current.removeTrack(sender));
                } catch (e) {
                    if (__DEV__) console.warn('Error removing tracks:', e);
                }
                peerConnection.current.close();
                peerConnection.current = null;
            }
        };
    }, [setupSignaling, startCall, localStreamRef]);

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
