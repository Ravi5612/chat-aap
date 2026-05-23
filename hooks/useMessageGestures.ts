import { useSharedValue, useAnimatedStyle, withSpring, runOnJS, interpolate, Extrapolation } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

export function useMessageGestures(isCurrentUser: boolean, message: any, onReply?: (message: any) => void) {
    const swipeX = useSharedValue(0);
    const hasVibrated = useSharedValue(false);

    const panGesture = Gesture.Pan()
        .activeOffsetX(isCurrentUser ? [-15, 0] : [0, 15])
        .onUpdate((event) => {
            if (isCurrentUser) {
                if (event.translationX < 0) {
                    swipeX.value = Math.max(event.translationX, -100);
                    if (swipeX.value < -60 && !hasVibrated.value) {
                        hasVibrated.value = true;
                        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
                    } else if (swipeX.value >= -60 && hasVibrated.value) {
                        hasVibrated.value = false;
                    }
                } else {
                    swipeX.value = 0;
                }
            } else {
                if (event.translationX > 0) {
                    swipeX.value = Math.min(event.translationX, 100);
                    if (swipeX.value > 60 && !hasVibrated.value) {
                        hasVibrated.value = true;
                        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
                    } else if (swipeX.value <= 60 && hasVibrated.value) {
                        hasVibrated.value = false;
                    }
                } else {
                    swipeX.value = 0;
                }
            }
        })
        .onEnd((event) => {
            const triggered = isCurrentUser ? (event.translationX < -60) : (event.translationX > 60);
            if (triggered && onReply) {
                runOnJS(onReply)(message);
            }
            swipeX.value = withSpring(0, { damping: 15, stiffness: 150 });
            hasVibrated.value = false;
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: swipeX.value }],
    }));

    const iconAnimatedStyle = useAnimatedStyle(() => {
        const absSwipeX = Math.abs(swipeX.value);
        const opacity = interpolate(absSwipeX, [30, 60], [0, 1], Extrapolation.CLAMP);
        const scale = interpolate(absSwipeX, [40, 70], [0.8, 1.2], Extrapolation.CLAMP);
        return {
            opacity,
            transform: [{ scale }],
        };
    });

    return { panGesture, animatedStyle, iconAnimatedStyle, swipeX };
}
