import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface WatchPartyState {
    videoId: string;
    hostId: string;
    status: 'playing' | 'paused';
    currentTime: number;
}

interface WatchPartyBubbleProps {
    message: any;
    currentUserId: string;
    friendName?: string;
    roomId: string;
}

export default function WatchPartyBubble({ message, currentUserId, friendName, roomId }: WatchPartyBubbleProps) {
    const router = useRouter();
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
            ])
        ).start();
    }, []);

    let partyState: WatchPartyState;
    try {
        partyState = JSON.parse(message.message);
    } catch (e) {
        return <Text style={{ color: 'red' }}>Corrupted Party Data</Text>;
    }

    const { videoId, hostId } = partyState;
    const isHost = hostId === currentUserId;
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    const handleJoin = () => {
        // Navigate to the split-screen Watch Party theater
        router.push(`/chat/watch-party/${roomId}?videoId=${videoId}&messageId=${message.id}`);
    };

    return (
        <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.header}>
                <Ionicons name="film" size={16} color="#EAB308" />
                <Text style={styles.title}>Premium Watch Party</Text>
            </View>

            <Image 
                source={{ uri: thumbnailUrl }} 
                style={styles.thumbnail} 
                resizeMode="cover"
            />

            <Text style={styles.description}>
                {isHost ? "You started a Watch Party!" : `${friendName || 'Friend'} invited you to watch a movie!`}
            </Text>

            <TouchableOpacity style={styles.joinBtn} onPress={handleJoin} activeOpacity={0.8}>
                <Ionicons name={isHost ? "play" : "enter"} size={18} color="white" />
                <Text style={styles.joinText}>{isHost ? "Enter Theater" : "Join Party"}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 250,
        backgroundColor: '#0F172A', // Darker theme
        borderRadius: 20,
        padding: 16,
        alignSelf: 'center',
        marginVertical: 8,
        borderWidth: 1.5,
        borderColor: 'rgba(234, 179, 8, 0.3)', // Golden subtle border
        shadowColor: '#EAB308',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 6,
    },
    title: {
        fontWeight: 'bold',
        color: '#F8FAFC',
        fontSize: 14,
        letterSpacing: 0.5,
    },
    thumbnail: {
        width: '100%',
        height: 120,
        borderRadius: 8,
        backgroundColor: '#0F172A',
        marginBottom: 10,
    },
    description: {
        fontSize: 13,
        color: '#CBD5E1',
        marginBottom: 12,
        textAlign: 'center',
    },
    joinBtn: {
        backgroundColor: '#EAB308', // Yellow/Gold for premium cinema feel
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
        shadowColor: '#EAB308',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 4,
    },
    joinText: {
        color: '#0F172A',
        fontWeight: '900',
        fontSize: 15,
        letterSpacing: 0.5,
    }
});
