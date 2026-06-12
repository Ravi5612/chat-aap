import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface WatchPartyState {
    videoId: string;
    hostId: string;
    status: 'playing' | 'paused';
    currentTime: number;
    invite_status?: 'pending' | 'active' | 'declined' | 'expired';
    createdAt?: string;
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
    const [updating, setUpdating] = useState(false);

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

    const { videoId, hostId, invite_status = 'active' } = partyState;
    const isHost = hostId === currentUserId;
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    const handleUpdateStatus = async (newStatus: string) => {
        if (updating) return;
        setUpdating(true);
        const newState = { ...partyState, invite_status: newStatus };
        await supabase.from('messages').update({ message: JSON.stringify(newState) }).eq('id', message.id);
        setUpdating(false);
    };

    const handleJoin = () => {
        const pId = partyState.partyId || message.id;
        router.push(`/chat/watch-party/${pId}?videoId=${videoId}&messageId=${message.id}&hostId=${hostId}`);
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

            {invite_status === 'pending' && (
                <View style={styles.pendingArea}>
                    <Text style={styles.timerText}>
                        Ticket Received 🎫
                    </Text>
                    {isHost ? (
                        <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={() => handleUpdateStatus('expired')} disabled={updating}>
                            <Text style={styles.btnText}>Cancel Invite</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={[styles.btn, styles.declineBtn]} onPress={() => handleUpdateStatus('declined')} disabled={updating}>
                                <Ionicons name="close" size={20} color="white" />
                                <Text style={styles.btnText}>Decline</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={() => handleUpdateStatus('active')} disabled={updating}>
                                <Ionicons name="checkmark" size={20} color="white" />
                                <Text style={styles.btnText}>Accept</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            {invite_status === 'active' && (
                <TouchableOpacity style={styles.joinBtn} onPress={handleJoin} activeOpacity={0.8}>
                    <Ionicons name={isHost ? "play" : "enter"} size={18} color="white" />
                    <Text style={styles.joinText}>{isHost ? "Enter Theater" : "Join Party"}</Text>
                </TouchableOpacity>
            )}

            {invite_status === 'declined' && (
                <View style={styles.resultArea}>
                    <Ionicons name="close-circle" size={40} color="#EF4444" />
                    <Text style={styles.resultText}>Invite Declined</Text>
                </View>
            )}

            {invite_status === 'expired' && (
                <View style={styles.resultArea}>
                    <Ionicons name="time" size={40} color="#94A3B8" />
                    <Text style={styles.resultText}>Invite Expired</Text>
                </View>
            )}

            {updating && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#EAB308" />
                </View>
            )}
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
    },
    pendingArea: {
        alignItems: 'center',
        marginTop: 8,
    },
    timerText: {
        color: '#EAB308',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
        letterSpacing: 1,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    btn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 4,
    },
    cancelBtn: { backgroundColor: '#334155', width: '100%' },
    declineBtn: { backgroundColor: '#EF4444' },
    acceptBtn: { backgroundColor: '#10B981' },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    resultArea: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    resultText: {
        color: '#94A3B8',
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 8,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
    }
});
