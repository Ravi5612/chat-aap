import React, { useState, useRef, useEffect, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withRepeat,
    interpolate,
    Extrapolate,
    runOnJS
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AudioRecorderProps {
    onRecordingComplete: (uri: string) => void;
    onCancel: () => void;
}

// Sub-component moved outside to prevent re-creation on every parent render
const WaveBar = memo(({ anim }: { anim: Animated.SharedValue<number> }) => {
    const style = useAnimatedStyle(() => ({
        height: anim.value,
        backgroundColor: '#F68537',
        width: 3,
        borderRadius: 2,
        marginHorizontal: 1.5,
    }));
    return <Animated.View style={style} />;
});

export default function AudioRecorder({ onRecordingComplete, onCancel }: AudioRecorderProps) {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [seconds, setSeconds] = useState(0);
    const [isPreparing, setIsPreparing] = useState(true);
    const timerRef = useRef<any>(null);
    const isMounted = useRef(true);
    const activeRecordingRef = useRef<Audio.Recording | null>(null);

    // Animation shared values
    const metering = useSharedValue(-160);
    const opacity = useSharedValue(0);

    // Glowing dot pulse animation
    const dotPulse = useSharedValue(1);

    // 20 waveform bars for high fidelity visualization
    const waveAnims = [
        useSharedValue(6), useSharedValue(6), useSharedValue(6), useSharedValue(6), useSharedValue(6),
        useSharedValue(6), useSharedValue(6), useSharedValue(6), useSharedValue(6), useSharedValue(6),
        useSharedValue(6), useSharedValue(6), useSharedValue(6), useSharedValue(6), useSharedValue(6),
        useSharedValue(6), useSharedValue(6), useSharedValue(6), useSharedValue(6), useSharedValue(6)
    ];

    useEffect(() => {
        isMounted.current = true;
        startRecording();
        
        // Slide-in animation for container
        opacity.value = withTiming(1, { duration: 250 });

        // Loop pulsing red recording dot
        dotPulse.value = withRepeat(
            withTiming(0.3, { duration: 750 }),
            -1, // infinite
            true // reverse
        );

        return () => {
            isMounted.current = false;
            if (timerRef.current) clearInterval(timerRef.current);

            // Cleanup: ensure active recording is stopped & unloaded
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
                        metering.value = status.metering;
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
            if (uri) {
                onRecordingComplete(uri);
            }
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

    const animatedContainerStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: interpolate(opacity.value, [0, 1], [30, 0]) }]
    }));

    const dotAnimatedStyle = useAnimatedStyle(() => ({
        opacity: dotPulse.value,
        transform: [{ scale: interpolate(dotPulse.value, [0.3, 1], [0.85, 1.1]) }]
    }));

    return (
        <Animated.View style={[styles.container, animatedContainerStyle]}>
            {/* Left: Discard Button */}
            <TouchableOpacity onPress={handleDiscard} style={styles.iconBtn}>
                <Ionicons name="trash" size={24} color="#EF4444" />
            </TouchableOpacity>

            {/* Center: Timer + Waveform */}
            <View style={styles.centerSection}>
                <View style={styles.timerContainer}>
                    <Animated.View style={[styles.dot, dotAnimatedStyle, { opacity: isPreparing ? 0.3 : 1 }]} />
                    <Text style={[styles.timerText, isPreparing && { fontSize: 13, color: '#9CA3AF' }]} numberOfLines={1}>
                        {isPreparing ? "Preparing..." : formatTime(seconds)}
                    </Text>
                </View>
                
                {!isPreparing && (
                    <View style={styles.waveContainer}>
                        {waveAnims.map((anim, i) => <WaveBar key={i} anim={anim} />)}
                    </View>
                )}
            </View>

            {/* Right: Send Button */}
            <TouchableOpacity 
                onPress={handleStop} 
                style={[styles.sendBtn, isPreparing && { opacity: 0.5, backgroundColor: '#D1D5DB' }]}
                disabled={isPreparing || !recording}
            >
                <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 10,
        left: 8,
        right: 8,
        height: 52,
        borderRadius: 26,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 6,
        zIndex: 1000
    },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2',
    },
    centerSection: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        marginRight: 6,
    },
    timerText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        fontVariant: ['tabular-nums'],
    },
    waveContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 30,
        paddingHorizontal: 4,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F68537',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#F68537',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
        paddingLeft: 3, // visual centering for send icon
    }
});
