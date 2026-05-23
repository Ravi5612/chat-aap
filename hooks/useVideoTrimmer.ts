import { useState, useRef, useCallback } from 'react';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export function useVideoTrimmer() {
    const videoRef = useRef<any>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [duration, setDuration] = useState(0);
    const [trimStart, setTrimStart] = useState(0);
    const [trimEnd, setTrimEnd] = useState(30);

    const togglePlayback = useCallback(async () => {
        if (!videoRef.current) return;
        try {
            if (isPlaying) {
                await videoRef.current.pauseAsync();
                setIsPlaying(false);
            } else {
                await videoRef.current.playAsync();
                setIsPlaying(true);
            }
        } catch (e) {
            console.error('Toggle Playback Error:', e);
        }
    }, [isPlaying]);

    const handleTouch = useCallback((evt: any) => {
        if (duration <= 0) return;
        const touchX = evt.nativeEvent.locationX;
        const percentage = Math.max(0, Math.min(1, touchX / (width - 62)));
        const selectedTime = percentage * duration;

        const distToStart = Math.abs(selectedTime - trimStart);
        const distToEnd = Math.abs(selectedTime - trimEnd);

        if (distToStart < distToEnd) {
            const newStart = Math.max(0, Math.min(trimEnd - 1, Math.round(selectedTime)));
            setTrimStart(newStart);
            videoRef.current?.setStatusAsync({ positionMillis: newStart * 1000 });
        } else {
            const maxEnd = Math.min(duration, trimStart + 30);
            const newEnd = Math.max(trimStart + 1, Math.min(maxEnd, Math.round(selectedTime)));
            setTrimEnd(newEnd);
            videoRef.current?.setStatusAsync({ positionMillis: newEnd * 1000 });
        }
    }, [duration, trimStart, trimEnd]);

    return {
        videoRef,
        isPlaying,
        setIsPlaying,
        duration,
        setDuration,
        trimStart,
        setTrimStart,
        trimEnd,
        setTrimEnd,
        togglePlayback,
        handleTouch
    };
}
