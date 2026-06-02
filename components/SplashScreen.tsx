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

    // Illustration animation
    const illustrationOpacity = useSharedValue(0);
    const illustrationTranslateY = useSharedValue(50);

    const logoStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translateX.value },
                { scale: scale.value }
            ],
            opacity: opacity.value
        };
    });

    const illustrationStyle = useAnimatedStyle(() => {
        return {
            opacity: illustrationOpacity.value,
            transform: [{ translateY: illustrationTranslateY.value }]
        };
    });

    useEffect(() => {
        // Step 1: Slide in from left + Fade In Logo
        opacity.value = withDelay(100, withTiming(1, { duration: 1000 }));
        translateX.value = withDelay(100, withSpring(0, {
            damping: 15,
            stiffness: 60, 
            mass: 1
        }));

        // Fade up illustration shortly after logo starts
        illustrationOpacity.value = withDelay(500, withTiming(1, { duration: 1000 }));
        illustrationTranslateY.value = withDelay(500, withSpring(0, { damping: 15, stiffness: 60 }));

        // Step 2: Zoom In gradually
        scale.value = withDelay(800, withTiming(1.3, { 
            duration: 2500,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        }, (finished) => {
            if (finished) {
                // Step 3: Finish -> Trigger Callback
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
            
            <Animated.View style={[styles.illustrationContainer, illustrationStyle]}>
                <Image
                    source={require('@/assets/images/splash-illustration.jpg')}
                    style={styles.illustration}
                    contentFit="contain"
                />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#FFFFFF', // Clean white background to match illustration
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        paddingTop: 80, // Push everything down a bit
    },
    logoContainer: {
        width: 280, // Made logo bigger
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    illustrationContainer: {
        width: width * 0.9,
        height: width * 0.9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    illustration: {
        width: '100%',
        height: '100%',
    }
});
