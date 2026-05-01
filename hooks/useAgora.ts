import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { logErrorToDB } from '@/utils/errorLogger';

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
    const isJoining = useRef(false);

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
            setConnectionStatus('Missing App ID');
            return;
        }

        try {
            await requestPermissions();
            
            if (!engine.current) {
                engine.current = AgoraRTC.createAgoraRtcEngine();
                const rtcEngine = engine.current;

                rtcEngine.initialize({
                    appId: APP_ID,
                    channelProfile: AgoraRTC.ChannelProfileType.ChannelProfileCommunication,
                });

                const eventHandler = {
                    onJoinChannelSuccess: (connection: any) => {
                        console.log('Joined channel successfully');
                        setJoined(true);
                        setConnectionStatus('Connected');
                    },
                    onUserJoined: (connection: any, remoteUid: number) => {
                        console.log('Remote user joined:', remoteUid);
                        setRemoteUid(remoteUid);
                        if (callState === 'outgoing') onAcceptCall();
                    },
                    onUserOffline: (connection: any, remoteUid: number) => {
                        console.log('Remote user offline:', remoteUid);
                        setRemoteUid(0);
                        onEndCall();
                    },
                    onLeaveChannel: () => {
                        console.log('Left channel');
                        setJoined(false);
                        setConnectionStatus('Disconnected');
                    },
                    onError: (err: any) => {
                        console.error('Agora Error:', err);
                        setConnectionStatus(`Error: ${err}`);
                        logErrorToDB(err, 'Agora Native Error', currentUser?.id, currentUser?.name);
                    }
                };

                rtcEngine.registerEventHandler(eventHandler);
                rtcEngine.enableVideo();
                rtcEngine.startPreview();
            }

            if (!currentUser?.id || !friend?.id) {
                return;
            }

            const ids = [currentUser.id, friend.id].sort();
            channelName.current = `call_${ids[0].substring(0, 8)}_${ids[1].substring(0, 8)}`;
            console.log('Channel Name set:', channelName.current);

        } catch (e) {
            console.error('Failed to initialize Agora', e);
            setConnectionStatus('Init Failed');
            logErrorToDB(e, 'Agora Initialization', currentUser?.id, currentUser?.name);
        }
    }, [currentUser?.id, friend?.id, callState, onAcceptCall, onEndCall]);

    const join = async () => {
        if (!engine.current || !AgoraRTC || !channelName.current || isJoining.current || joined) {
            return;
        }
        try {
            isJoining.current = true;
            console.log('[DEBUG] Agora: Joining channel:', channelName.current);
            engine.current.joinChannel('', channelName.current, 0, {
                clientRoleType: AgoraRTC.ClientRoleType.ClientRoleBroadcaster,
                publishMicrophoneTrack: true,
                publishCameraTrack: callType === 'video',
                autoSubscribeAudio: true,
                autoSubscribeVideo: true,
            });
        } catch (e) {
            isJoining.current = false;
            console.error('Failed to join channel', e);
            logErrorToDB(e, 'Agora Join Channel', currentUser?.id, currentUser?.name);
        }
    };

    const leave = useCallback(async () => {
        try {
            if (engine.current) {
                engine.current.leaveChannel();
                // We keep the engine but leave the channel
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
        const isCallActive = ['active', 'outgoing', 'incoming'].includes(callState);
        
        if (AgoraRTC && isCallActive) {
            init().then(() => {
                if ((callState === 'active' || callState === 'outgoing') && channelName.current) {
                    join();
                }
            });
        }

        return () => {
            if (!isCallActive) {
                leave();
            }
        };
    }, [callState, AgoraRTC, currentUser?.id, friend?.id, init]);

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
