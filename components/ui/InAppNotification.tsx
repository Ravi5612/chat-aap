import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;

export interface InAppNotificationData {
    title: string;
    body: string;
    image?: string;
    senderId: string;
    isGroup?: boolean;
}

interface InAppNotificationProps {
    notification: InAppNotificationData | null;
    onClose: () => void;
}

export default function InAppNotification({ notification, onClose }: InAppNotificationProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const translateY = useRef(new Animated.Value(-150)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const timeoutRef = useRef<any>(null);

    useEffect(() => {
        if (notification) {
            // Show animation
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: insets.top + 10,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 8,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            // Auto hide after 4 seconds
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(hideNotification, 4000);
        } else {
            hideNotification();
        }

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [notification]);

    const hideNotification = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -150,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    const handlePress = () => {
        if (notification) {
            const nameParam = encodeURIComponent(notification.title);
            const groupParam = notification.isGroup ? 'true' : 'false';
            const imageParam = encodeURIComponent(notification.image || '');
            router.push(`/chat/${notification.senderId}?name=${nameParam}&isGroup=${groupParam}&image=${imageParam}`);
            hideNotification();
        }
    };

    if (!notification) return null;

    return (
        <Animated.View 
            style={[
                styles.container, 
                { 
                    transform: [{ translateY }],
                    opacity 
                }
            ]}
        >
            <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={handlePress}
                style={styles.touchable}
            >
                <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint="light" style={styles.blur}>
                    <View style={styles.content}>
                        <Image 
                            source={{ uri: notification.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(notification.title)}&backgroundColor=F68537` }}
                            style={styles.avatar}
                         cachePolicy="memory-disk" />
                        <View style={styles.textContainer}>
                            <Text style={styles.title} numberOfLines={1}>{notification.title}</Text>
                            <Text style={styles.body} numberOfLines={2}>{notification.body}</Text>
                        </View>
                        <View style={styles.actionIcon}>
                            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                        </View>
                    </View>
                </BlurView>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 10,
        right: 10,
        zIndex: 9999,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    touchable: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    blur: {
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3F4F6',
    },
    textContainer: {
        flex: 1,
        marginLeft: 12,
        marginRight: 8,
    },
    title: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 2,
    },
    body: {
        fontSize: 13,
        color: '#4B5563',
    },
    actionIcon: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
