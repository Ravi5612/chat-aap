import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
import { Image } from 'expo-image'; // Use expo-image for better performance if needed, or standard Image

interface ChatLoaderProps {
    variant?: 'overlay' | 'inline';
    size?: 'small' | 'medium' | 'large';
}

const { width } = Dimensions.get('window');

export default function ChatLoader({ variant = 'overlay', size = 'large' }: ChatLoaderProps) {
    const isOverlay = variant === 'overlay';
    const scale = useSharedValue(0.7);
    const opacity = useSharedValue(0.7);

    useEffect(() => {
        // Runs entirely on the UI thread, unaffected by JS thread blocks (like crypto ops)
        scale.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) })
            ),
            -1, // Infinite loop
            true // Reverse
        );
        opacity.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
            opacity: opacity.value,
        };
    });

    const sizeStyles = {
        small: width * 0.3,
        medium: width * 0.5,
        large: width * 0.7,
    };

    const imageWidth = sizeStyles[size] || sizeStyles.large;

    return (
        <View style={[
            styles.container,
            isOverlay ? styles.overlay : styles.inline
        ]}>
            <Animated.View style={[{
                width: imageWidth,
                aspectRatio: 1,
                justifyContent: 'center',
                alignItems: 'center',
            }, animatedStyle]}>
                <Image
                    source={require('@/assets/images/loader-img.png')}
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                    contentFit="contain" // For expo-image, or use resizeMode="contain" for standard Image
                />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 999,
        backgroundColor: '#FFF5E6', // Beige background matching theme
    },
    inline: {
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
    },
});
