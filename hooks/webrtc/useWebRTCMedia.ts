import { useState, useCallback, useRef, MutableRefObject } from 'react';
import { isWebRTCSupported, mediaDevices } from './webrtcModule';

export const useWebRTCMedia = (
    callTypeRef: MutableRefObject<string>,
    facingModeRef: MutableRefObject<string>
) => {
    const [localStream, setLocalStream] = useState<any>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(callTypeRef.current === 'audio');
    const localStreamRef = useRef<any>(null);

    const setupMedia = useCallback(async () => {
        if (!isWebRTCSupported) {
            if (__DEV__) console.warn("WebRTC setup skipped: Not supported in this environment");
            return null;
        }

        try {
            const constraints: any = {
                video: callTypeRef.current === 'video' ? {
                    facingMode: facingModeRef.current,
                    frameRate: 30,
                } : false,
                audio: true
            };

            const stream = await mediaDevices.getUserMedia(constraints) as any;
            localStreamRef.current = stream;
            setLocalStream(stream);
            return stream;
        } catch (err) {
            if (__DEV__) console.error("Media setup failed:", err);
            // Fallback for video fail -> audio only
            if (callTypeRef.current === 'video') {
                try {
                    const audioStream = await mediaDevices.getUserMedia({ video: false, audio: true }) as any;
                    localStreamRef.current = audioStream;
                    setLocalStream(audioStream);
                    setIsVideoOff(true);
                    return audioStream;
                } catch (e) {
                    if (__DEV__) console.error("Audio fallback failed:", e);
                    return null;
                }
            }
            return null;
        }
    }, [callTypeRef, facingModeRef]);

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

    return {
        localStream,
        localStreamRef,
        isMuted,
        isVideoOff,
        setupMedia,
        toggleMute,
        toggleVideo,
        switchCamera
    };
};
