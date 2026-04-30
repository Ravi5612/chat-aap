import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';

let AgoraRTC: any = null;
try {
    // Attempt to load Agora only on native and if available
    if (Platform.OS !== 'web') {
        AgoraRTC = require('react-native-agora');
    }
} catch (e) {
    console.warn('Agora SDK not found or not linked. Calling features will be disabled.');
}

const APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '';

export const useAgora = ({
    currentUser,
    friend,
    callType,
    callState,
    onAcceptCall,
    onEndCall
}: any) => {
    const [joined, setJoined] = useState(false);
    const [remoteUid, setRemoteUid] = useState<number>(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
    const [connectionStatus, setConnectionStatus] = useState(AgoraRTC ? 'Disconnected' : 'SDK Not Found');
    
    const engine = useRef<any>(null);
    const channelName = useRef<string>('');

    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            const { PermissionsAndroid } = require('react-native');
            await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                PermissionsAndroid.PERMISSIONS.CAMERA,
            ]);
        }
    };

    const init = useCallback(async () => {
        if (!AgoraRTC) return;
        if (!APP_ID || APP_ID === 'YOUR_AGORA_APP_ID_HERE') {
            console.error('Agora App ID is missing.');
            return;
        }

        try {
            await requestPermissions();
            
            engine.current = AgoraRTC.createAgoraRtcEngine();
            const rtcEngine = engine.current;

            rtcEngine.initialize({
                appId: APP_ID,
                channelProfile: AgoraRTC.ChannelProfileType.ChannelProfileCommunication,
            });

            const eventHandler = {
                onJoinChannelSuccess: (connection: any) => {
                    setJoined(true);
                    setConnectionStatus('Connected');
                },
                onUserJoined: (connection: any, remoteUid: number) => {
                    setRemoteUid(remoteUid);
                    if (callState === 'outgoing') onAcceptCall();
                },
                onUserOffline: () => {
                    setRemoteUid(0);
                    onEndCall();
                },
                onLeaveChannel: () => {
                    setJoined(false);
                    setConnectionStatus('Disconnected');
                }
            };

            rtcEngine.registerEventHandler(eventHandler);
            rtcEngine.enableVideo();
            rtcEngine.startPreview();

            if (!currentUser?.id || !friend?.id) {
                // Not an error, just waiting for data to load
                return;
            }

            const ids = [currentUser.id, friend.id].sort();
            channelName.current = `call_${ids[0].substring(0, 8)}_${ids[1].substring(0, 8)}`;

        } catch (e) {
            console.error('Failed to initialize Agora', e);
        }
    }, [currentUser?.id, friend?.id, callState, onAcceptCall, onEndCall]);

    const join = async () => {
        if (!engine.current || !AgoraRTC) return;
        try {
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
        if (AgoraRTC) {
            init().then(() => {
                if (callState === 'active' || callState === 'outgoing') {
                    join();
                }
            });
        }

        return () => {
            leave();
        };
    }, [callState, AgoraRTC]);

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
