import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withTiming,
    withDelay,
    runOnJS,
    Easing
} from 'react-native-reanimated';
import { Image } from 'expo-image';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
    onAnimationFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationFinish }) => {
    // 1. Start from left side (off screen)
    const translateX = useSharedValue(-width);

    // 2. Scale starts small
    const scale = useSharedValue(0.5);

    // 3. Opacity
    const opacity = useSharedValue(0);

    const logoStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translateX.value },
                { scale: scale.value }
            ],
            opacity: opacity.value
        };
    });

    useEffect(() => {
        // Animation Sequence

        // Step 1: Slide in from left + Fade In (Slower, start after small delay)
        opacity.value = withDelay(300, withTiming(1, { duration: 1500 }));
        translateX.value = withDelay(300, withSpring(0, {
            damping: 15,
            stiffness: 40, // Reduced stiffness for slower bounce
            mass: 1.5      // Increased mass for "heavier" feel
        }));

        // Step 2: Zoom In gradually (Starts after slide completes approx)
        scale.value = withDelay(1800, withTiming(1.8, { // Increased zoom factor slightly
            duration: 3000, // Doubled duration for very slow zoom
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        }, (finished) => {
            if (finished) {
                // Step 3: Finish -> Trigger Callback to hide splash
                runOnJS(onAnimationFinish)();
            }
        }));
    }, []);

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.logoContainer, logoStyle]}>
                <Image
                    source={require('@/assets/images/logo.png')}
                    style={styles.logo}
                    contentFit="contain"
                />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#FFF5E6', // Light orange background matching app theme
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
    },
    logoContainer: {
        width: 200,
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: '100%',
        height: '100%',
    }
});
