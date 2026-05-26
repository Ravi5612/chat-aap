import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    interpolate,
} from 'react-native-reanimated';

import { useAudioRecording } from '@/hooks/chatInput/useAudioRecording';

// WaveBar sub-component — memo to prevent re-creation on parent re-render
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

interface AudioRecorderProps {
    onRecordingComplete: (uri: string) => void;
    onCancel: () => void;
}

export default function AudioRecorder({ onRecordingComplete, onCancel }: AudioRecorderProps) {
    // 20 waveform bars — must stay in component due to React hook rules
    const waveAnims = [
        useSharedValue(6), useSharedValue(6), useSharedValue(6), useSharedValue(6), useSharedValue(6),
        useSharedValue(6), useSharedValue(6), useSharedValue(6), useSharedValue(6), useSharedValue(6),
        useSharedValue(6), useSharedValue(6), useSharedValue(6), useSharedValue(6), useSharedValue(6),
        useSharedValue(6), useSharedValue(6), useSharedValue(6), useSharedValue(6), useSharedValue(6),
    ];

    const {
        recording,
        seconds,
        isPreparing,
        dotPulse,
        opacity,
        handleStop,
        handleDiscard,
        formatTime,
    } = useAudioRecording(waveAnims, onRecordingComplete, onCancel);

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
        width: 44, height: 44, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#FEF2F2',
    },
    centerSection: {
        flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8,
    },
    timerContainer: {
        flexDirection: 'row', alignItems: 'center', marginRight: 12,
    },
    dot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: '#EF4444', marginRight: 6,
    },
    timerText: {
        fontSize: 16, fontWeight: '600', color: '#1F2937',
        fontVariant: ['tabular-nums'],
    },
    waveContainer: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', height: 30, paddingHorizontal: 4,
    },
    sendBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#F68537', alignItems: 'center', justifyContent: 'center',
        shadowColor: '#F68537', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
        paddingLeft: 3,
    }
});
