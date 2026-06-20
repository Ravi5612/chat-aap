import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface TicTacToeSetupConfig {
    mode: 'classic' | 'infinite';
    timer: 0 | 5 | 10;
}

interface Props {
    visible: boolean;
    onClose: () => void;
    onStartGame: (config: TicTacToeSetupConfig) => void;
}

export default function TicTacToeSetupModal({ visible, onClose, onStartGame }: Props) {
    const [mode, setMode] = useState<'classic' | 'infinite'>('infinite');
    const [timer, setTimer] = useState<0 | 5 | 10>(0);

    if (!visible) return null;

    return (
        <Modal transparent visible animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Tic Tac Toe Settings</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                            <Ionicons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Game Mode</Text>
                            <View style={styles.cardRow}>
                                <TouchableOpacity 
                                    style={[styles.card, mode === 'classic' && styles.cardActive]}
                                    onPress={() => setMode('classic')}
                                >
                                    <Text style={[styles.cardTitle, mode === 'classic' && styles.textActive]}>Classic</Text>
                                    <Text style={[styles.cardDesc, mode === 'classic' && styles.textActive]}>Standard 3x3 game. Often ends in a draw.</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.card, mode === 'infinite' && styles.cardActive]}
                                    onPress={() => setMode('infinite')}
                                >
                                    <Text style={[styles.cardTitle, mode === 'infinite' && styles.textActive]}>Infinite 🔥</Text>
                                    <Text style={[styles.cardDesc, mode === 'infinite' && styles.textActive]}>Max 3 pieces per player. 4th piece deletes the 1st piece!</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Turn Timer (Blitz Mode)</Text>
                            <View style={styles.toggleRow}>
                                <TouchableOpacity 
                                    style={[styles.toggleBtn, timer === 0 && styles.toggleBtnActive]}
                                    onPress={() => setTimer(0)}
                                >
                                    <Text style={[styles.toggleBtnText, timer === 0 && styles.toggleBtnTextActive]}>Off</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.toggleBtn, timer === 5 && styles.toggleBtnActive]}
                                    onPress={() => setTimer(5)}
                                >
                                    <Text style={[styles.toggleBtnText, timer === 5 && styles.toggleBtnTextActive]}>5s</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.toggleBtn, timer === 10 && styles.toggleBtnActive]}
                                    onPress={() => setTimer(10)}
                                >
                                    <Text style={[styles.toggleBtnText, timer === 10 && styles.toggleBtnTextActive]}>10s</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.helperText}>If the timer runs out, a random move will be played.</Text>
                        </View>

                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity 
                            style={styles.startBtn}
                            onPress={() => {
                                onStartGame({ mode, timer });
                                onClose();
                            }}
                        >
                            <Ionicons name="play" size={20} color="white" style={{ marginRight: 8 }} />
                            <Text style={styles.startBtnText}>Start Match</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#334155',
        marginBottom: 12,
    },
    cardRow: {
        flexDirection: 'row',
        gap: 12,
    },
    card: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        padding: 12,
        backgroundColor: '#F8FAFC',
    },
    cardActive: {
        borderColor: '#3B82F6',
        backgroundColor: '#EFF6FF',
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#475569',
        marginBottom: 4,
    },
    cardDesc: {
        fontSize: 12,
        color: '#64748B',
        lineHeight: 16,
    },
    textActive: {
        color: '#2563EB',
    },
    toggleRow: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 4,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    toggleBtnActive: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    toggleBtnText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '600',
    },
    toggleBtnTextActive: {
        color: '#3B82F6',
    },
    helperText: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 6,
    },
    footer: {
        padding: 20,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    startBtn: {
        backgroundColor: '#3B82F6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
    },
    startBtnText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    }
});
