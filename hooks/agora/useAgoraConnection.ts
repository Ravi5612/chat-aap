import { useCallback, MutableRefObject } from 'react';
import * as AgoraRTC from 'react-native-agora';
import { ChannelProfileType, ClientRoleType, IRtcEngine } from 'react-native-agora';
import { requestAgoraPermissions } from '@/services/agora/agoraPermissionsService';

const APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '';

export const useAgoraConnection = (
    engine: MutableRefObject<IRtcEngine | null>,
    channelName: MutableRefObject<string>,
    isJoining: MutableRefObject<boolean>,
    hasAcceptedRef: MutableRefObject<boolean>,
    callTypeRef: MutableRefObject<'audio' | 'video'>,
    stateRef: MutableRefObject<string | null>,
    onAcceptCallRef: MutableRefObject<() => void>,
    onEndCallRef: MutableRefObject<() => void>,
    isGroup: boolean,
    joined: boolean,
    setJoined: (val: boolean) => void,
    setRemoteUids: (val: any) => void,
    setConnectionStatus: (val: string) => void,
    setRemoteAudioMuted: (val: boolean) => void,
    setRemoteVideoMuted: (val: boolean) => void,
    setIsEngineReady: (val: boolean) => void
) => {

    const init = async (): Promise<boolean> => {
        if (engine.current) return true;
        
        try {
            if (__DEV__) console.log('[CALL_ACTION] Initializing Agora Engine...');
            
            if (!APP_ID) {
                if (__DEV__) console.error('[CALL_ACTION] AGORA_APP_ID is missing! Check your environment variables.');
                setConnectionStatus('Error: Missing App ID');
                return false;
            }

            const hasPermission = await requestAgoraPermissions(callTypeRef.current);
            if (!hasPermission) {
                setConnectionStatus('Error: Permissions denied');
                return false;
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
                    setRemoteUids((prev: number[]) => [...new Set([...prev, rUid])]);
                    
                    if (stateRef.current === 'outgoing' && !hasAcceptedRef.current) {
                        hasAcceptedRef.current = true;
                        onAcceptCallRef.current();
                    }
                },
                onUserOffline: (connection: any, rUid: number) => {
                    if (__DEV__) console.log('[CALL_ACTION] Remote user offline:', rUid);
                    setRemoteUids((prev: number[]) => prev.filter(uid => uid !== rUid));
                    
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
            rtcEngine.setEnableSpeakerphone(callTypeRef.current === 'video'); // Audio routing fix
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
    }, [setJoined, setRemoteUids, setIsEngineReady, setConnectionStatus, engine, isJoining]);

    return { init, join, leave };
};
