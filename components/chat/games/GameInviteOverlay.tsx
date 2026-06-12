import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

interface GameInviteProps {
    gameName: string;
    gameState: any;
    currentUserId: string;
    messageId: string;
    children: React.ReactNode;
}

export default function GameInviteOverlay({ gameName, gameState, currentUserId, messageId, children }: GameInviteProps) {
    const [timeLeft, setTimeLeft] = useState(120);
    const [updating, setUpdating] = useState(false);

    const isHost = currentUserId === gameState.hostId;
    const status = gameState.status || 'active'; // fallback for old games

    useEffect(() => {
        if (status !== 'pending' || !gameState.createdAt) return;

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - new Date(gameState.createdAt).getTime()) / 1000);
            const remaining = Math.max(120 - elapsed, 0);
            setTimeLeft(remaining);

            if (remaining === 0 && status === 'pending') {
                // Only host expires it to prevent duplicate updates
                if (isHost) handleUpdateStatus('expired');
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [gameState.createdAt, status, isHost]);

    const handleUpdateStatus = async (newStatus: string) => {
        if (updating) return;
        setUpdating(true);
        const newState = { ...gameState, status: newStatus };
        await supabase.from('messages').update({ message: JSON.stringify(newState) }).eq('id', messageId);
        setUpdating(false);
    };

    if (status === 'active') {
        return <>{children}</>;
    }

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Ionicons name="game-controller" size={24} color="#3B82F6" />
                <Text style={styles.title}>{gameName} Challenge</Text>
            </View>

            {status === 'pending' && (
                <View style={styles.content}>
                    <Text style={styles.subtitle}>
                        {isHost ? "Waiting for opponent..." : "You have been challenged!"}
                    </Text>
                    <Text style={styles.timer}>{formatTime(timeLeft)}</Text>

                    <View style={styles.actionRow}>
                        {isHost ? (
                            <TouchableOpacity 
                                style={[styles.btn, styles.cancelBtn]} 
                                onPress={() => handleUpdateStatus('expired')}
                                disabled={updating}
                            >
                                <Text style={styles.btnText}>Cancel</Text>
                            </TouchableOpacity>
                        ) : (
                            <>
                                <TouchableOpacity 
                                    style={[styles.btn, styles.declineBtn]} 
                                    onPress={() => handleUpdateStatus('declined')}
                                    disabled={updating}
                                >
                                    <Ionicons name="close" size={20} color="white" />
                                    <Text style={styles.btnText}>Decline</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.btn, styles.acceptBtn]} 
                                    onPress={() => handleUpdateStatus('active')}
                                    disabled={updating}
                                >
                                    <Ionicons name="checkmark" size={20} color="white" />
                                    <Text style={styles.btnText}>Accept</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            )}

            {status === 'declined' && (
                <View style={styles.content}>
                    <Ionicons name="close-circle" size={48} color="#EF4444" />
                    <Text style={styles.resultText}>Challenge Declined</Text>
                </View>
            )}

            {status === 'expired' && (
                <View style={styles.content}>
                    <Ionicons name="time" size={48} color="#94A3B8" />
                    <Text style={styles.resultText}>Challenge Expired</Text>
                </View>
            )}

            {updating && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: 320,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
        alignSelf: 'center',
    },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
        paddingBottom: 12, marginBottom: 16,
    },
    title: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    content: { alignItems: 'center', paddingVertical: 8 },
    subtitle: { fontSize: 14, color: '#64748B', marginBottom: 12 },
    timer: { fontSize: 32, fontWeight: '800', color: '#F59E0B', marginBottom: 24, fontVariant: ['tabular-nums'] },
    actionRow: { flexDirection: 'row', gap: 12, width: '100%' },
    btn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
        paddingVertical: 12, borderRadius: 12,
    },
    cancelBtn: { backgroundColor: '#94A3B8' },
    declineBtn: { backgroundColor: '#EF4444' },
    acceptBtn: { backgroundColor: '#10B981' },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    resultText: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginTop: 12 },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.7)',
        justifyContent: 'center', alignItems: 'center',
        borderRadius: 16,
    }
});
