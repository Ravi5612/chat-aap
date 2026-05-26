import { useState, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useSharedValue, withRepeat, withTiming, withSpring, interpolate, Extrapolate } from 'react-native-reanimated';

export const useAudioRecording = (
    waveAnims: ReturnType<typeof useSharedValue<number>>[],
    onRecordingComplete: (uri: string) => void,
    onCancel: () => void
) => {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [seconds, setSeconds] = useState(0);
    const [isPreparing, setIsPreparing] = useState(true);
    const timerRef = useRef<any>(null);
    const isMounted = useRef(true);
    const activeRecordingRef = useRef<Audio.Recording | null>(null);

    // Glowing dot pulse animation
    const dotPulse = useSharedValue(1);
    const opacity = useSharedValue(0);

    useEffect(() => {
        isMounted.current = true;
        startRecording();

        opacity.value = withTiming(1, { duration: 250 });
        dotPulse.value = withRepeat(
            withTiming(0.3, { duration: 750 }),
            -1,
            true
        );

        return () => {
            isMounted.current = false;
            if (timerRef.current) clearInterval(timerRef.current);
            if (activeRecordingRef.current) {
                const rec = activeRecordingRef.current;
                rec.stopAndUnloadAsync().catch(e => console.warn('AudioRecorder: Cleanup stop failed', e.message));
            }
        };
    }, []);

    const startRecording = async () => {
        try {
            setIsPreparing(true);
            const permissionStatus = await Audio.getPermissionsAsync();
            if (permissionStatus.status !== 'granted') {
                const requested = await Audio.requestPermissionsAsync();
                if (requested.status !== 'granted') return onCancel();
            }

            Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
            }).catch(() => {});

            const { recording: newRecording } = await Audio.Recording.createAsync(
                {
                    ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
                    android: {
                        ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
                        extension: '.m4a',
                        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
                        audioEncoder: Audio.AndroidAudioEncoder.AAC,
                    },
                    ios: {
                        ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
                        extension: '.m4a',
                        audioQuality: Audio.IOSAudioQuality.HIGH,
                        sampleRate: 44100,
                        numberOfChannels: 2,
                        bitRate: 128000,
                        linearPCMBitDepth: 16,
                        linearPCMIsBigEndian: false,
                        linearPCMIsFloat: false,
                    },
                },
                (status) => {
                    if (status.metering !== undefined) {
                        const val = interpolate(status.metering, [-60, 0], [6, 32], Extrapolate.CLAMP);
                        waveAnims.forEach((anim) => {
                            anim.value = withSpring(val * (0.3 + Math.random() * 0.7));
                        });
                    }
                },
                80
            );

            activeRecordingRef.current = newRecording;

            if (!isMounted.current) {
                await newRecording.stopAndUnloadAsync();
                return;
            }

            setRecording(newRecording);
            setIsPreparing(false);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            timerRef.current = setInterval(() => {
                setSeconds(s => s + 1);
            }, 1000);
        } catch (err: any) {
            console.error('AudioRecorder: Failed to start recording', err.message);
            onCancel();
        }
    };

    const handleStop = async () => {
        if (!recording) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (timerRef.current) clearInterval(timerRef.current);
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            activeRecordingRef.current = null;
            if (uri) onRecordingComplete(uri);
        } catch (e) {
            console.error('AudioRecorder: Stop failed', e);
            onCancel();
        }
    };

    const handleDiscard = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onCancel();
    };

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return {
        recording,
        seconds,
        isPreparing,
        dotPulse,
        opacity,
        handleStop,
        handleDiscard,
        formatTime,
    };
};
