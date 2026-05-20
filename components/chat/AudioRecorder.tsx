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
    const timerRef = useRef<any>(null);
    const isMounted = useRef(true);
    const activeRecordingRef = useRef<Audio.Recording | null>(null);

    // Animation shared values
    const metering = useSharedValue(-160);
    const translateX = useSharedValue(0);
    const opacity = useSharedValue(0);

    // Glowing dot pulse animation
    const dotPulse = useSharedValue(1);

    // Sliding cancel hint chevron animation
    const chevronSlide = useSharedValue(0);

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

        // Loop sliding cancel arrow hint
        chevronSlide.value = withRepeat(
            withTiming(-12, { duration: 1200 }),
            -1, // infinite
            false // do not reverse, reset to 0 to simulate slide gesture direction
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
            // ⚡ Instant startup optimization 1: Check permissions without calling slow request API if already granted
            const permissionStatus = await Audio.getPermissionsAsync();
            if (permissionStatus.status !== 'granted') {
                const requested = await Audio.requestPermissionsAsync();
                if (requested.status !== 'granted') return onCancel();
            }

            // ⚡ Instant startup optimization 2: Run setAudioModeAsync without awaiting to avoid locking thread for 150ms
            Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
            }).catch(() => {});

            // 3. Create and Prepare Recording (runs directly after fast precheck)
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
                        // Dynamically update 20 wave bar heights based on audio input levels
                        const val = interpolate(status.metering, [-60, 0], [6, 32], Extrapolate.CLAMP);
                        waveAnims.forEach((anim) => {
                            anim.value = withSpring(val * (0.3 + Math.random() * 0.7));
                        });
                    }
                },
                80 // Check frequency (faster response rate)
            );

            activeRecordingRef.current = newRecording;

            if (!isMounted.current) {
                await newRecording.stopAndUnloadAsync();
                return;
            }

            setRecording(newRecording);
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

    // Swipe to cancel gesture layout binding
    const gesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .onUpdate((event) => {
            if (event.translationX < 0) {
                translateX.value = event.translationX;
            }
        })
        .onEnd((event) => {
            if (event.translationX < -110) {
                translateX.value = withTiming(-SCREEN_WIDTH, { duration: 180 }, () => {
                    runOnJS(handleDiscard)();
                });
            } else {
                translateX.value = withSpring(0);
            }
        });

    const animatedContainerStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: interpolate(opacity.value, [0, 1], [30, 0]) }]
    }));

    const slideStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }]
    }));

    const dotAnimatedStyle = useAnimatedStyle(() => ({
        opacity: dotPulse.value,
        transform: [{ scale: interpolate(dotPulse.value, [0.3, 1], [0.85, 1.1]) }]
    }));

    const chevronAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: chevronSlide.value }],
        opacity: interpolate(chevronSlide.value, [0, -12], [1, 0.15])
    }));

    return (
        <GestureHandlerRootView style={StyleSheet.absoluteFillObject}>
            <Animated.View style={[styles.container, animatedContainerStyle]}>
                <View style={styles.glassBackground} />

                <View style={styles.metaRow}>
                    <Animated.View style={[styles.dot, dotAnimatedStyle]} />
                    <Text style={styles.timerText}>{formatTime(seconds)}</Text>
                </View>

                {/* High fidelity waveform visualization */}
                <View style={styles.waveContainer}>
                    {waveAnims.map((anim, i) => <WaveBar key={i} anim={anim} />)}
                </View>

                <GestureDetector gesture={gesture}>
                    <Animated.View style={[styles.controlsRow, slideStyle]}>
                        <TouchableOpacity onPress={handleDiscard} style={styles.discardBtn}>
                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>

                        <View style={styles.cancelHintContainer}>
                            <Animated.View style={chevronAnimatedStyle}>
                                <Ionicons name="chevron-back" size={15} color="#94A3B8" />
                            </Animated.View>
                            <Text style={styles.cancelText}>Swipe to cancel</Text>
                        </View>

                        <TouchableOpacity onPress={handleStop} style={styles.sendBtn}>
                            <Ionicons name="send" size={18} color="white" />
                        </TouchableOpacity>
                    </Animated.View>
                </GestureDetector>
            </Animated.View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 10,
        zIndex: 1000
    },
    glassBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#FFFFFF',
        opacity: 0.97,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        marginRight: 6,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 2
    },
    timerText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#EF4444',
        fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    },
    waveContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 40,
        marginHorizontal: 10,
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    discardBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    cancelHintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        width: 105,
        marginRight: 2,
    },
    cancelText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
        marginLeft: 2,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F68537',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#F68537',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    }
});
