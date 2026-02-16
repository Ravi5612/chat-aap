import React, { useEffect } from 'react';
import { View, Image, Animated, StyleSheet, Dimensions } from 'react-native';

interface ChatLoaderProps {
    variant?: 'overlay' | 'inline';
    size?: 'small' | 'medium' | 'large';
}

const { width } = Dimensions.get('window');

export default function ChatLoader({ variant = 'overlay', size = 'large' }: ChatLoaderProps) {
    const isOverlay = variant === 'overlay';
    const pulseAnim = new Animated.Value(0.7);

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.7,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

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
            <Animated.View style={{
                width: imageWidth,
                aspectRatio: 1,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: pulseAnim,
                transform: [{ scale: pulseAnim }]
            }}>
                <Image
                    source={require('@/assets/images/loader-img.png')}
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                    resizeMode="contain"
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
