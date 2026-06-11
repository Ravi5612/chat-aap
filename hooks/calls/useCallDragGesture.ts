import { useMemo } from 'react';
import { useSharedValue, withSpring, runOnJS, useAnimatedStyle } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';

export const useCallDragGesture = (toggleSwap: () => void) => {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const offsetX = useSharedValue(0);
    const offsetY = useSharedValue(0);

    const panGesture = useMemo(() => Gesture.Pan()
        .onUpdate((event) => {
            translateX.value = offsetX.value + event.translationX;
            translateY.value = offsetY.value + event.translationY;
        })
        .onEnd(() => {
            offsetX.value = translateX.value;
            offsetY.value = translateY.value;
        }),
    [translateX, translateY, offsetX, offsetY]);

    const tapGesture = useMemo(() => Gesture.Tap()
        .onEnd(() => {
            runOnJS(toggleSwap)();
        }),
    [toggleSwap]);

    const composedGesture = useMemo(() => 
        Gesture.Simultaneous(panGesture, tapGesture),
    [panGesture, tapGesture]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: withSpring(translateX.value, { damping: 15 }) },
            { translateY: withSpring(translateY.value, { damping: 15 }) },
        ],
    }));

    return { composedGesture, animatedStyle };
};
