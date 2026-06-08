import { useState, useEffect, useRef } from 'react';
import { IRtcEngine } from 'react-native-agora';
import { useAgoraActions } from './agora/useAgoraActions';
import { useAgoraConnection } from './agora/useAgoraConnection';

interface UseAgoraProps {
    callState: 'incoming' | 'outgoing' | 'active' | null;
    callType: 'audio' | 'video';
    onEndCall: () => void;
    onAcceptCall: () => void;
    currentUser: any;
    friend: any;
    isGroup?: boolean;
}

export const useAgora = ({
    callState,
    callType,
    onEndCall,
    onAcceptCall,
    currentUser,
    friend,
    isGroup = false
}: UseAgoraProps) => {
    const [joined, setJoined] = useState(false);
    const [remoteUids, setRemoteUids] = useState<number[]>([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isSpeakerphone, setIsSpeakerphone] = useState(callType === 'video'); // Default true for video, false for audio
    const [remoteAudioMuted, setRemoteAudioMuted] = useState(false);
    const [remoteVideoMuted, setRemoteVideoMuted] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('Initializing...');
    const [isEngineReady, setIsEngineReady] = useState(false);
    
    const engine = useRef<IRtcEngine | null>(null);
    const channelName = useRef<string>('');
    const isJoining = useRef(false);
    const hasAcceptedRef = useRef(false);

    // Refs for stable event handler callbacks
    const onEndCallRef = useRef(onEndCall);
    const onAcceptCallRef = useRef(onAcceptCall);
    const callTypeRef = useRef(callType);

    useEffect(() => {
        onEndCallRef.current = onEndCall;
        onAcceptCallRef.current = onAcceptCall;
        callTypeRef.current = callType;
    }, [onEndCall, onAcceptCall, callType]);

    // Stabilize callState with a Ref to avoid closures issues
    const stateRef = useRef(callState);
    useEffect(() => {
        stateRef.current = callState;
        if (callState === null) {
            hasAcceptedRef.current = false; // Reset on call end
        }
    }, [callState]);

    useEffect(() => {
        if (currentUser?.id && friend?.id) {
            if (isGroup) {
                channelName.current = `group_call_${friend.id.substring(0, 16)}`;
            } else {
                const ids = [currentUser.id, friend.id].sort();
                channelName.current = `call_${ids[0].substring(0, 8)}_${ids[1].substring(0, 8)}`;
            }
        }
    }, [currentUser?.id, friend?.id, isGroup]);

    const { init, join, leave } = useAgoraConnection(
        engine,
        channelName,
        isJoining,
        hasAcceptedRef,
        callTypeRef,
        stateRef,
        onAcceptCallRef,
        onEndCallRef,
        isGroup,
        joined,
        setJoined,
        setRemoteUids,
        setConnectionStatus,
        setRemoteAudioMuted,
        setRemoteVideoMuted,
        setIsEngineReady
    );

    const {
        toggleMute,
        toggleVideo,
        switchCamera,
        toggleScreenShare,
        toggleSpeakerphone
    } = useAgoraActions(
        engine,
        callTypeRef,
        isMuted, setIsMuted,
        isVideoOff, setIsVideoOff,
        isScreenSharing, setIsScreenSharing,
        isSpeakerphone, setIsSpeakerphone
    );

    useEffect(() => {
        const isCallActive = ['active', 'outgoing', 'incoming'].includes(callState as string);
        
        if (isCallActive) {
            init().then((success) => {
                if (success && (stateRef.current === 'active' || stateRef.current === 'outgoing')) {
                    join();
                }
            });
        } else {
            leave();
        }
    }, [callState]); // Removed 'joined' to fix infinite loop

    useEffect(() => {
        return () => {
            if (engine.current) {
                if (__DEV__) console.log('[CALL_ACTION] Cleanup - releasing Agora engine');
                try {
                    engine.current.leaveChannel();
                    engine.current.release();
                } catch (e) {}
                engine.current = null;
            }
        };
    }, []);

    return {
        joined,
        remoteUids,
        isMuted,
        isVideoOff,
        isSpeakerphone,
        remoteAudioMuted,
        remoteVideoMuted,
        connectionStatus,
        isScreenSharing,
        toggleMute,
        toggleVideo,
        toggleSpeakerphone,
        toggleScreenShare,
        switchCamera,
        leave,
        channelId: channelName.current,
        isEngineReady
    };
};
