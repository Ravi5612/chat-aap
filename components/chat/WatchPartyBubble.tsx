import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
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
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="film" size={16} color="#EAB308" />
                <Text style={styles.title}>Watch Party</Text>
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
                <Text style={styles.joinText}>{isHost ? "Open Theater" : "Join Party"}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 240,
        backgroundColor: '#1E293B', // Dark theme for cinema feel
        borderRadius: 16,
        padding: 12,
        alignSelf: 'center',
        marginVertical: 4,
        borderWidth: 1,
        borderColor: '#334155',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 4,
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
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    joinText: {
        color: '#1E293B',
        fontWeight: 'bold',
        fontSize: 14,
    }
});
