import { useMemo } from 'react';
import { useSharedValue, withSpring, runOnJS, useAnimatedStyle } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';

export const useCallDragGesture = (toggleSwap: () => void) => {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const offsetX = useSharedValue(0);
    const offsetY = useSharedValue(0);
    // Track whether the finger moved significantly (drag vs tap)
    const didDrag = useSharedValue(false);

    const panGesture = useMemo(() => Gesture.Pan()
        .onStart(() => {
            didDrag.value = false;
        })
        .onUpdate((event) => {
            // If moved more than 8px consider it a drag, not a tap
            if (Math.abs(event.translationX) > 8 || Math.abs(event.translationY) > 8) {
                didDrag.value = true;
            }
            translateX.value = offsetX.value + event.translationX;
            translateY.value = offsetY.value + event.translationY;
        })
        .onEnd(() => {
            offsetX.value = translateX.value;
            offsetY.value = translateY.value;
            // If barely moved → treat as tap → swap videos
            if (!didDrag.value) {
                runOnJS(toggleSwap)();
            }
        }),
    [translateX, translateY, offsetX, offsetY, didDrag, toggleSwap]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: withSpring(translateX.value, { damping: 15 }) },
            { translateY: withSpring(translateY.value, { damping: 15 }) },
        ],
    }));

    return { composedGesture: panGesture, animatedStyle };
};
