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
        marginHorizontal: 1
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

    // Fixed hooks for waveform bars (Rules of Hooks compliance)
    const b1 = useSharedValue(5);
    const b2 = useSharedValue(5);
    const b3 = useSharedValue(5);
    const b4 = useSharedValue(5);
    const b5 = useSharedValue(5);
    const b6 = useSharedValue(5);
    const b7 = useSharedValue(5);
    const b8 = useSharedValue(5);
    const b9 = useSharedValue(5);
    const b10 = useSharedValue(5);

    const waveAnims = [b1, b2, b3, b4, b5, b6, b7, b8, b9, b10];

    useEffect(() => {
        isMounted.current = true;
        startRecording();
        opacity.value = withTiming(1, { duration: 300 });

        return () => {
            isMounted.current = false;
            if (timerRef.current) clearInterval(timerRef.current);

            // Critical cleanup: ensure any active recording is stopped and unloaded
            if (activeRecordingRef.current) {
                const rec = activeRecordingRef.current;
                rec.stopAndUnloadAsync().catch(e => console.warn('AudioRecorder: Cleanup stop failed', e.message));
            }
        };
    }, []);

    const startRecording = async () => {
        try {
            // 1. Permissions
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') return onCancel();

            // 2. Audio Mode Configuration
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
            });

            // 3. Create and Prepare Recording
            // We use createAsync but we track it immediately in ref for cleanup
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
                        const val = interpolate(status.metering, [-60, 0], [5, 30], Extrapolate.CLAMP);
                        waveAnims.forEach((anim) => {
                            anim.value = withSpring(val * (0.4 + Math.random() * 0.6));
                        });
                    }
                },
                100
            );

            activeRecordingRef.current = newRecording;

            if (!isMounted.current) {
                // If unmounted while preparing, unload immediately
                await newRecording.stopAndUnloadAsync();
                return;
            }

            setRecording(newRecording);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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

    // Gesture Handling
    const gesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .onUpdate((event) => {
            if (event.translationX < 0) {
                translateX.value = event.translationX;
            }
        })
        .onEnd((event) => {
            if (event.translationX < -100) {
                translateX.value = withTiming(-SCREEN_WIDTH, { duration: 200 }, () => {
                    runOnJS(handleDiscard)();
                });
            } else {
                translateX.value = withSpring(0);
            }
        });

    const animatedContainerStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: interpolate(opacity.value, [0, 1], [50, 0]) }]
    }));

    const slideStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }]
    }));

    return (
        <GestureHandlerRootView style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
            <Animated.View style={[styles.container, animatedContainerStyle]}>
                <View style={styles.blurBackground} />

                <View style={styles.recordingIndicator}>
                    <View style={styles.dot} />
                    <Text style={styles.timerText}>{formatTime(seconds)}</Text>
                </View>

                <View style={styles.waveContainer}>
                    {waveAnims.map((anim, i) => <WaveBar key={i} anim={anim} />)}
                </View>

                <GestureDetector gesture={gesture}>
                    <Animated.View style={[styles.controls, slideStyle]}>
                        <TouchableOpacity onPress={handleDiscard} style={styles.discardBtn}>
                            <Ionicons name="trash-outline" size={22} color="#EF4444" />
                        </TouchableOpacity>

                        <View style={styles.cancelHint}>
                            <Ionicons name="chevron-back" size={16} color="#94A3B8" />
                            <Text style={styles.cancelText}>Swipe to cancel</Text>
                        </View>

                        <TouchableOpacity
                            onPress={handleStop}
                            style={styles.sendBtn}
                        >
                            <Ionicons name="send" size={20} color="white" />
                        </TouchableOpacity>
                    </Animated.View>
                </GestureDetector>
            </Animated.View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    blurBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'white',
        opacity: 0.9,
    },
    recordingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        marginRight: 6,
    },
    timerText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    waveContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 40,
        marginHorizontal: 8,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    discardBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
    },
    cancelHint: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    cancelText: {
        fontSize: 12,
        color: '#94A3B8',
        marginLeft: 2,
    },
    sendBtn: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#F68537',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#F68537',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    }
});
