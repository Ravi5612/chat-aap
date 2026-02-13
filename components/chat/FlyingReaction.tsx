import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withTiming,
    withDelay,
    Easing,
    runOnJS
} from 'react-native-reanimated';

interface FlyingReactionProps {
    emoji: string;
    onComplete?: () => void;
}

export default function FlyingReaction({ emoji, onComplete }: FlyingReactionProps) {
    const translateY = useSharedValue(0);
    const translateX = useSharedValue(0);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.5);
    const rotate = useSharedValue(0);

    useEffect(() => {
        // Opacity Animation
        opacity.value = withSequence(
            withTiming(1, { duration: 300 }),
            withDelay(800, withTiming(0, { duration: 400 }))
        );

        // Scale Animation
        scale.value = withSequence(
            withTiming(1.2, { duration: 300, easing: Easing.out(Easing.back(2)) }),
            withTiming(1, { duration: 200 }),
            withDelay(600, withTiming(0.8, { duration: 400 }))
        );

        // Translate Y (Fly Up)
        translateY.value = withTiming(-120, {
            duration: 1500,
            easing: Easing.out(Easing.quad)
        }, (finished) => {
            if (finished && onComplete) {
                runOnJS(onComplete)();
            }
        });

        // Translate X (Zigzag / Butterfly effect)
        translateX.value = withSequence(
            withTiming(-15, { duration: 300 }),
            withTiming(15, { duration: 400 }),
            withTiming(-8, { duration: 400 }),
            withTiming(0, { duration: 400 })
        );

        // Rotation (Wobble)
        rotate.value = withSequence(
            withTiming(15, { duration: 300 }),
            withTiming(-15, { duration: 400 }),
            withTiming(10, { duration: 400 }),
            withTiming(0, { duration: 400 })
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [
                { translateY: translateY.value },
                { translateX: translateX.value },
                { scale: scale.value },
                { rotate: `${rotate.value}deg` }
            ]
        };
    });

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <Animated.Text style={styles.text}>{emoji}</Animated.Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 20,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        alignSelf: 'center',
    },
    text: {
        fontSize: 40,
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    }
});
