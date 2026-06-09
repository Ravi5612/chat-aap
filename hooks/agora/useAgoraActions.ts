import { MutableRefObject } from 'react';
import { IRtcEngine } from 'react-native-agora';

export const useAgoraActions = (
    engine: MutableRefObject<IRtcEngine | null>,
    callTypeRef: MutableRefObject<'audio' | 'video'>,
    isMuted: boolean,
    setIsMuted: (val: boolean) => void,
    isVideoOff: boolean,
    setIsVideoOff: (val: boolean) => void,
    isScreenSharing: boolean,
    setIsScreenSharing: (val: boolean) => void,
    isSpeakerphone: boolean,
    setIsSpeakerphone: (val: boolean) => void,
    setAudioRoute: (val: number) => void
) => {
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
        if (engine.current && !isScreenSharing) {
            engine.current.switchCamera();
        }
    };

    const toggleScreenShare = async () => {
        if (!engine.current) return;
        try {
            if (isScreenSharing) {
                await engine.current.stopScreenCapture();
                if (callTypeRef.current === 'video') {
                    await engine.current.updateChannelMediaOptions({
                        publishScreenCaptureVideo: false,
                        publishCameraTrack: true,
                    });
                    if (!isVideoOff) engine.current.startPreview();
                }
                setIsScreenSharing(false);
            } else {
                await engine.current.startScreenCapture({
                    captureVideo: true,
                    captureAudio: false,
                    videoParams: { dimensions: { width: 1280, height: 720 }, frameRate: 15, bitrate: 1000 }
                });
                await engine.current.updateChannelMediaOptions({
                    publishCameraTrack: false,
                    publishScreenCaptureVideo: true,
                });
                setIsScreenSharing(true);
            }
        } catch (e) {
            if (__DEV__) console.error('[CALL_ACTION] Screen share error:', e);
        }
    };

    const toggleSpeakerphone = () => {
        if (engine.current) {
            const newState = !isSpeakerphone;
            engine.current.setEnableSpeakerphone(newState);
            setIsSpeakerphone(newState);
        }
    };

    const setAudioRouteAction = (route: number) => {
        if (engine.current) {
            engine.current.setRouteInCommunicationMode(route);
            setAudioRoute(route);
            // 3 = Speakerphone, 0 = Default/Earpiece, 5 = Bluetooth
            if (route === 3) setIsSpeakerphone(true);
            else setIsSpeakerphone(false);
        }
    };

    return {
        toggleMute,
        toggleVideo,
        switchCamera,
        toggleScreenShare,
        toggleSpeakerphone,
        setAudioRouteAction
    };
};
