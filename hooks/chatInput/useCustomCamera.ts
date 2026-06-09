import { useState, useRef, useEffect, useCallback } from 'react';
import { CameraView, CameraType, FlashMode } from 'expo-camera';
import * as Haptics from 'expo-haptics';

export const useCustomCamera = (
    onCapture: (media: { uri: string; type: 'image' | 'video' }) => void,
    onClose: () => void
) => {
    const [cameraMode, setCameraMode] = useState<'picture' | 'video'>('picture');
    const [facing, setFacing] = useState<CameraType>('back');
    const [flash, setFlash] = useState<FlashMode>('off');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    
    const cameraRef = useRef<CameraView>(null);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRecording) {
            setRecordingDuration(0);
            interval = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } else {
            setRecordingDuration(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRecording]);

    const toggleFacing = useCallback(() => setFacing(current => (current === 'back' ? 'front' : 'back')), []);
    const toggleFlash = useCallback(() => setFlash(current => (current === 'off' ? 'on' : 'off')), []);

    const handleLongPress = useCallback(async () => {
        if (!cameraRef.current) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCameraMode('video');
        
        // Short delay to allow CameraView to switch mode before recording
        setTimeout(async () => {
            setIsRecording(true);
            try {
                const video = await cameraRef.current?.recordAsync({ maxDuration: 60 });
                if (video && video.uri) {
                    onCapture({ uri: video.uri, type: 'video' });
                    onClose();
                }
            } catch (error) {
                console.error('Record error:', error);
            }
            setIsRecording(false);
            setCameraMode('picture');
        }, 150);
    }, [onCapture, onClose]);

    const handlePressOut = useCallback(async () => {
        if (isRecording && cameraRef.current) {
            cameraRef.current.stopRecording();
            setIsRecording(false);
            setCameraMode('picture');
        }
    }, [isRecording]);

    const handlePress = useCallback(async () => {
        if (cameraMode === 'video' || isRecording) return; // Ignore single tap if recording
        if (!cameraRef.current) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
            if (photo && photo.uri) {
                onCapture({ uri: photo.uri, type: 'image' });
                onClose();
            }
        } catch (error) {
            console.error('Take picture error:', error);
        }
    }, [cameraMode, isRecording, onCapture, onClose]);

    return {
        cameraMode, facing, flash, isRecording, recordingDuration, cameraRef,
        toggleFacing, toggleFlash, handleLongPress, handlePressOut, handlePress
    };
};
