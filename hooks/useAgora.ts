import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import {
    createAgoraRtcEngine,
    ChannelProfileType,
    ClientRoleType,
    IRtcEngine,
    RtcConnection,
    IRtcEngineEventHandler,
    VideoSourceType,
    RenderModeType
} from 'react-native-agora';
import { supabase } from '@/lib/supabase';

const APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '';

export const useAgora = ({
    currentUser,
    friend,
    callType,
    callState,
    onAcceptCall,
    onEndCall,
    incomingOffer // This was for WebRTC, we'll ignore it for Agora or use it as a trigger
}: any) => {
    const [joined, setJoined] = useState(false);
    const [remoteUid, setRemoteUid] = useState<number>(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    
    const engine = useRef<IRtcEngine | null>(null);
    const channelName = useRef<string>('');

    // Request permissions
    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                PermissionsAndroid.PERMISSIONS.CAMERA,
            ]);
        }
    };

    const init = useCallback(async () => {
        if (!APP_ID || APP_ID === 'YOUR_AGORA_APP_ID_HERE') {
            console.error('Agora App ID is missing. Please set it in .env');
            return;
        }

        try {
            await requestPermissions();
            
            engine.current = createAgoraRtcEngine();
            const rtcEngine = engine.current;

            rtcEngine.initialize({
                appId: APP_ID,
                channelProfile: ChannelProfileType.ChannelProfileCommunication,
            });

            const eventHandler: IRtcEngineEventHandler = {
                onJoinChannelSuccess: (connection: RtcConnection, elapsed: number) => {
                    console.log('Joined channel successfully', connection.channelId);
                    setJoined(true);
                    setConnectionStatus('Connected');
                },
                onUserJoined: (connection: RtcConnection, remoteUid: number, elapsed: number) => {
                    console.log('Remote user joined', remoteUid);
                    setRemoteUid(remoteUid);
                    if (callState === 'outgoing') {
                        onAcceptCall();
                    }
                },
                onUserOffline: (connection: RtcConnection, remoteUid: number, reason: any) => {
                    console.log('Remote user left', remoteUid);
                    setRemoteUid(0);
                    onEndCall();
                },
                onLeaveChannel: (connection: RtcConnection, stats: any) => {
                    console.log('Left channel');
                    setJoined(false);
                    setConnectionStatus('Disconnected');
                },
                onError: (err: any) => {
                    console.error('Agora error', err);
                }
            };

            rtcEngine.registerEventHandler(eventHandler);
            rtcEngine.enableVideo();
            rtcEngine.startPreview();

            // Set unique channel name based on user IDs
            const ids = [currentUser.id, friend.id].sort();
            channelName.current = `call_${ids[0].substring(0, 8)}_${ids[1].substring(0, 8)}`;

        } catch (e) {
            console.error('Failed to initialize Agora', e);
        }
    }, [currentUser?.id, friend?.id]);

    const join = async () => {
        if (!engine.current) return;
        
        try {
            // In a real app, you would fetch a token from your server here.
            // For testing, we use token = null (ensure "Testing Mode" is enabled in Agora Console)
            engine.current.joinChannel(null, channelName.current, 0, {});
        } catch (e) {
            console.error('Failed to join channel', e);
        }
    };

    const leave = useCallback(async () => {
        try {
            if (engine.current) {
                engine.current.leaveChannel();
                engine.current.unregisterEventHandler({});
                engine.current.release();
                engine.current = null;
            }
            setJoined(false);
            setRemoteUid(0);
        } catch (e) {
            console.error('Failed to leave channel', e);
        }
    }, []);

    const toggleMute = () => {
        if (!engine.current) return;
        engine.current.muteLocalAudioStream(!isMuted);
        setIsMuted(!isMuted);
    };

    const toggleVideo = () => {
        if (!engine.current) return;
        engine.current.muteLocalVideoStream(!isVideoOff);
        setIsVideoOff(!isVideoOff);
    };

    const switchCamera = () => {
        if (!engine.current) return;
        engine.current.switchCamera();
    };

    useEffect(() => {
        init().then(() => {
            if (callState === 'active' || callState === 'outgoing') {
                join();
            }
        });

        return () => {
            leave();
        };
    }, [callState]);

    return {
        joined,
        remoteUid,
        isMuted,
        isVideoOff,
        connectionStatus,
        toggleMute,
        toggleVideo,
        switchCamera,
        leave,
        engine: engine.current,
        channelName: channelName.current
    };
};
