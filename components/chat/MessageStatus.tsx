import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing as ReanimatedEasing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const PendingStatus = () => {
    const spinValue = useSharedValue(0);

    useEffect(() => {
        spinValue.value = withRepeat(
            withTiming(360, {
                duration: 1000,
                easing: ReanimatedEasing.linear,
            }),
            -1
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${spinValue.value}deg` }]
    }));

    return (
        <View style={styles.pendingContainer}>
            <Ionicons name="time-outline" size={10} color="#94a3b8" style={{ position: 'absolute' }} />
            <Animated.View
                style={[
                    styles.spinnerRing,
                    animatedStyle
                ]}
            />
        </View>
    );
};

interface MessageStatusProps {
    status: 'sending' | 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export default React.memo(function MessageStatus({ status }: MessageStatusProps) {
    if (status === 'sending' || status === 'pending') {
        return (
            <View style={styles.container}>
                <PendingStatus />
            </View>
        );
    }

    if (status === 'sent') {
        return (
            <View style={styles.container}>
                <Ionicons name="checkmark" size={16} color="#94a3b8" />
            </View>
        );
    }

    if (status === 'delivered') {
        return (
            <View style={styles.container}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: -6 }} />
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </View>
            </View>
        );
    }

    if (status === 'read') {
        return (
            <View style={styles.container}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="checkmark" size={16} color="#0D1B2A" style={{ marginRight: -6 }} />
                    <Ionicons name="checkmark" size={16} color="#0D1B2A" />
                </View>
            </View>
        );
    }

    if (status === 'failed') {
        return (
            <View style={styles.container}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
            </View>
        );
    }

    return null;
});

const styles = StyleSheet.create({
    container: {
        marginLeft: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
    },
    pendingContainer: {
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center'
    },
    spinnerRing: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 1.5,
        borderColor: '#94a3b8',
        borderTopColor: 'transparent',
    }
});
