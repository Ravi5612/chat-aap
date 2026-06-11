import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import AgoraVideoView from './AgoraVideoView';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const WIDGET_WIDTH = 100;
const WIDGET_HEIGHT = 150;

interface FloatingCallWidgetProps {
    uid: number;
    channelId: string;
    onMaximize: () => void;
    onEndCall: () => void;
}

export default function FloatingCallWidget({ uid, channelId, onMaximize, onEndCall }: FloatingCallWidgetProps) {
    // Initial position: Bottom right
    const translateX = useSharedValue(SCREEN_WIDTH - WIDGET_WIDTH - 20);
    const translateY = useSharedValue(SCREEN_HEIGHT - WIDGET_HEIGHT - 120);
    const offsetX = useSharedValue(SCREEN_WIDTH - WIDGET_WIDTH - 20);
    const offsetY = useSharedValue(SCREEN_HEIGHT - WIDGET_HEIGHT - 120);

    const panGesture = useMemo(() => Gesture.Pan()
        .onUpdate((event) => {
            // Keep it within screen bounds roughly
            translateX.value = Math.max(10, Math.min(offsetX.value + event.translationX, SCREEN_WIDTH - WIDGET_WIDTH - 10));
            translateY.value = Math.max(50, Math.min(offsetY.value + event.translationY, SCREEN_HEIGHT - WIDGET_HEIGHT - 50));
        })
        .onEnd(() => {
            offsetX.value = translateX.value;
            offsetY.value = translateY.value;
        }),
    []);

    const tapGesture = useMemo(() => Gesture.Tap()
        .onEnd(() => {
            runOnJS(onMaximize)();
        }),
    [onMaximize]);

    const composedGesture = useMemo(() => Gesture.Simultaneous(panGesture, tapGesture), [panGesture, tapGesture]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: withSpring(translateX.value, { damping: 15 }) },
            { translateY: withSpring(translateY.value, { damping: 15 }) },
        ],
    }));

    return (
        <GestureDetector gesture={composedGesture}>
            <Animated.View style={[styles.container, animatedStyle]}>
                <AgoraVideoView uid={uid} style={styles.video} channelId={channelId} />
                <TouchableOpacity style={styles.endButton} onPress={onEndCall} activeOpacity={0.8}>
                    <Ionicons name="call" size={16} color="white" />
                </TouchableOpacity>
            </Animated.View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        width: WIDGET_WIDTH,
        height: WIDGET_HEIGHT,
        backgroundColor: '#111827',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        zIndex: 9999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    endButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#EF4444',
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
    }
});
