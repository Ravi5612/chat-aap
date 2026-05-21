import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import * as AgoraRTC from 'react-native-agora';
import { 
    IRtcEngine, 
    ChannelProfileType, 
    ClientRoleType,
} from 'react-native-agora';

const APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '';

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

    const init = async (): Promise<boolean> => {
        if (engine.current) return true;
        
        try {
            if (__DEV__) console.log('[CALL_ACTION] Initializing Agora Engine...');
            
            if (!APP_ID) {
                if (__DEV__) console.error('[CALL_ACTION] AGORA_APP_ID is missing! Check your environment variables.');
                setConnectionStatus('Error: Missing App ID');
                return false;
            }

            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                ]);
                
                if (granted['android.permission.RECORD_AUDIO'] !== 'granted' || 
                    (callTypeRef.current === 'video' && granted['android.permission.CAMERA'] !== 'granted')) {
                    setConnectionStatus('Error: Permissions denied');
                    return false;
                }
            }

            const rtcEngine = AgoraRTC.createAgoraRtcEngine();
            engine.current = rtcEngine;

            const eventHandler = {
                onJoinChannelSuccess: (connection: any) => {
                    if (__DEV__) console.log('[CALL_ACTION] Joined successfully. Local UID:', connection.localUid);
                    setJoined(true);
                    setConnectionStatus('Connected');
                    if (callTypeRef.current === 'video') {
                        rtcEngine.enableLocalVideo(true);
                    }
                },
                onUserJoined: (connection: any, rUid: number) => {
                    if (__DEV__) console.log('[CALL_ACTION] REMOTE USER JOINED! UID:', rUid);
                    setRemoteUids(prev => [...new Set([...prev, rUid])]);
                    
                    if (stateRef.current === 'outgoing' && !hasAcceptedRef.current) {
                        hasAcceptedRef.current = true;
                        onAcceptCallRef.current();
                    }
                },
                onUserOffline: (connection: any, rUid: number) => {
                    if (__DEV__) console.log('[CALL_ACTION] Remote user offline:', rUid);
                    setRemoteUids(prev => prev.filter(uid => uid !== rUid));
                    
                    if (!isGroup) {
                        onEndCallRef.current();
                    }
                },
                onLeaveChannel: () => {
                    if (__DEV__) console.log('[CALL_ACTION] Left Agora channel');
                    setJoined(false);
                    setRemoteUids([]);
                    setRemoteAudioMuted(false);
                    setRemoteVideoMuted(false);
                    setConnectionStatus('Disconnected');
                },
                onUserMuteAudio: (connection: any, rUid: number, muted: boolean) => {
                    if (__DEV__) console.log('[CALL_ACTION] Remote user mute audio:', rUid, muted);
                    setRemoteAudioMuted(muted);
                },
                onUserMuteVideo: (connection: any, rUid: number, muted: boolean) => {
                    if (__DEV__) console.log('[CALL_ACTION] Remote user mute video:', rUid, muted);
                    setRemoteVideoMuted(muted);
                },
                onError: (err: any) => {
                    if (__DEV__) console.error('[CALL_ACTION] Agora Error:', err);
                    setConnectionStatus(`Error: ${err}`);
                }
            };

            rtcEngine.initialize({
                appId: APP_ID,
                channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
            });

            rtcEngine.registerEventHandler(eventHandler);
            rtcEngine.enableAudio();
            if (callTypeRef.current === 'video') {
                rtcEngine.enableVideo();
                rtcEngine.startPreview();
            }
            rtcEngine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
            setIsEngineReady(true);
            if (__DEV__) console.log('[CALL_ACTION] Agora Engine Initialized Successfully');
            return true;
        } catch (e) {
            if (__DEV__) console.error('[CALL_ACTION] Failed to initialize Agora:', e);
            setIsEngineReady(false);
            return false;
        }
    };

    const join = async () => {
        if (!engine.current || isJoining.current || joined || !channelName.current) {
            return;
        }

        try {
            isJoining.current = true;
            if (__DEV__) console.log('[CALL_ACTION] Joining channel:', channelName.current);
            if (callTypeRef.current === 'video') {
                engine.current.startPreview();
            }
            
            const joinResult = engine.current.joinChannel('', channelName.current, 0, {
                clientRoleType: ClientRoleType.ClientRoleBroadcaster,
                publishMicrophoneTrack: true,
                publishCameraTrack: callTypeRef.current === 'video',
                autoSubscribeAudio: true,
                autoSubscribeVideo: callTypeRef.current === 'video',
            });

            if (joinResult !== 0) {
                isJoining.current = false;
                setConnectionStatus(`Join Failed: ${joinResult}`);
            }
        } catch (e) {
            isJoining.current = false;
            if (__DEV__) console.error('[CALL_ACTION] Join error:', e);
        }
    };

    const leave = useCallback(() => {
        if (engine.current) {
            if (__DEV__) console.log('[CALL_ACTION] Leaving channel and stopping media');
            try {
                engine.current.leaveChannel();
                engine.current.stopPreview();
                engine.current.release(); // Fully release resources
            } catch (e) {
                if (__DEV__) console.warn('Error releasing engine:', e);
            }
            engine.current = null;
            setJoined(false);
            setIsEngineReady(false); // Reset ready state
            setRemoteUids([]);
            isJoining.current = false;
            setConnectionStatus('Disconnected');
        }
    }, []);

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

    const toggleMute = () => {
        if (engine.current) {
            engine.current.muteLocalAudioStream(!isMuted);
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (engine.current) {
            engine.current.muteLocalVideoStream(!isVideoOff);
            setIsVideoOff(!isVideoOff);
        }
    };

    const switchCamera = () => {
        if (engine.current) {
            engine.current.switchCamera();
        }
    };

    return {
        joined,
        remoteUids,
        isMuted,
        isVideoOff,
        remoteAudioMuted,
        remoteVideoMuted,
        connectionStatus,
        toggleMute,
        toggleVideo,
        switchCamera,
        leave,
        channelId: channelName.current,
        isEngineReady
    };
};
