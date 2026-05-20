import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
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
    
    const engine = useRef<IRtcEngine | null>(null);
    const channelName = useRef<string>('');
    const isJoining = useRef(false);
    const hasAcceptedRef = useRef(false); // NEW: Prevent multiple onAcceptCall triggers

    const init = async () => {
        if (engine.current) return;
        
        try {
            console.log('[CALL_ACTION] Initializing Agora Engine...');
            
            if (!APP_ID) {
                console.error('[CALL_ACTION] AGORA_APP_ID is missing! Check your environment variables.');
                setConnectionStatus('Error: Missing App ID');
                return;
            }

            if (Platform.OS === 'android') {
                const { PermissionsAndroid } = require('react-native');
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                ]);
                
                if (granted['android.permission.RECORD_AUDIO'] !== 'granted' || 
                    granted['android.permission.CAMERA'] !== 'granted') {
                    setConnectionStatus('Error: Permissions denied');
                    return;
                }
            }

            const rtcEngine = AgoraRTC.createAgoraRtcEngine();
            engine.current = rtcEngine;

            const eventHandler = {
                onJoinChannelSuccess: (connection: any) => {
                    console.log('[CALL_ACTION] Joined successfully. Local UID:', connection.localUid);
                    setJoined(true);
                    setConnectionStatus('Connected');
                    rtcEngine.enableLocalVideo(true);
                },
                onUserJoined: (connection: any, rUid: number) => {
                    console.log('[CALL_ACTION] REMOTE USER JOINED! UID:', rUid);
                    setRemoteUids(prev => [...new Set([...prev, rUid])]);
                    
                    // Only trigger acceptance ONCE to avoid state loops
                    if (stateRef.current === 'outgoing' && !hasAcceptedRef.current) {
                        hasAcceptedRef.current = true;
                        onAcceptCall();
                    }
                },
                onUserOffline: (connection: any, rUid: number) => {
                    console.log('[CALL_ACTION] Remote user offline:', rUid);
                    setRemoteUids(prev => prev.filter(uid => uid !== rUid));
                    
                    // Only end call automatically if it was 1-on-1
                    if (!isGroup) {
                        onEndCall();
                    }
                },
                onLeaveChannel: () => {
                    console.log('[CALL_ACTION] Left Agora channel');
                    setJoined(false);
                    setRemoteUids([]);
                    setRemoteAudioMuted(false);
                    setRemoteVideoMuted(false);
                    setConnectionStatus('Disconnected');
                },
                onUserMuteAudio: (connection: any, rUid: number, muted: boolean) => {
                    console.log('[CALL_ACTION] Remote user mute audio:', rUid, muted);
                    setRemoteAudioMuted(muted);
                },
                onUserMuteVideo: (connection: any, rUid: number, muted: boolean) => {
                    console.log('[CALL_ACTION] Remote user mute video:', rUid, muted);
                    setRemoteVideoMuted(muted);
                },
                onError: (err: any) => {
                    console.error('[CALL_ACTION] Agora Error:', err);
                    setConnectionStatus(`Error: ${err}`);
                }
            };

            rtcEngine.initialize({
                appId: APP_ID,
                channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
            });

            rtcEngine.registerEventHandler(eventHandler);
            rtcEngine.enableVideo();
            rtcEngine.enableAudio();
            rtcEngine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
            rtcEngine.startPreview();
            console.log('[CALL_ACTION] Agora Engine Initialized Successfully');
        } catch (e) {
            console.error('[CALL_ACTION] Failed to initialize Agora:', e);
        }
    };

    const join = async () => {
        if (!engine.current || isJoining.current || joined || !channelName.current) {
            return;
        }

        try {
            isJoining.current = true;
            console.log('[CALL_ACTION] Joining channel:', channelName.current);
            engine.current.startPreview();
            
            const joinResult = engine.current.joinChannel('', channelName.current, 0, {
                clientRoleType: ClientRoleType.ClientRoleBroadcaster,
                publishMicrophoneTrack: true,
                publishCameraTrack: callType === 'video',
                autoSubscribeAudio: true,
                autoSubscribeVideo: true,
            });

            if (joinResult !== 0) {
                isJoining.current = false;
                setConnectionStatus(`Join Failed: ${joinResult}`);
            }
        } catch (e) {
            isJoining.current = false;
            console.error('[CALL_ACTION] Join error:', e);
        }
    };

    const leave = useCallback(() => {
        if (engine.current) {
            console.log('[CALL_ACTION] Leaving channel and stopping media');
            engine.current.leaveChannel();
            engine.current.stopPreview();
            setJoined(false);
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
            init().then(() => {
                if (callState === 'active' || callState === 'outgoing') {
                    join();
                }
            });
        } else {
            if (joined || isJoining.current) {
                leave();
            }
        }
    }, [callState, joined]);

    useEffect(() => {
        return () => {
            if (engine.current) {
                console.log('[CALL_ACTION] Cleanup - releasing Agora engine');
                engine.current.leaveChannel();
                engine.current.release();
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
        channelId: channelName.current
    };
};
