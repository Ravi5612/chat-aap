import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LUDO_COLORS } from '@/utils/ludoConstants';

export interface LudoSetupConfig {
    hostColors: string[];
    opponentColors: string[];
}

interface Props {
    visible: boolean;
    onClose: () => void;
    onStartGame: (config: LudoSetupConfig) => void;
}

export default function LudoSetupModal({ visible, onClose, onStartGame }: Props) {
    const [mode, setMode] = useState<'1box' | '2box'>('1box');
    const [selectedHostColor, setSelectedHostColor] = useState<string>('R');

    const handleStart = () => {
        let hostColors: string[] = [];
        let opponentColors: string[] = [];

        if (mode === '1box') {
            hostColors = [selectedHostColor];
            // Assign opposite color to opponent
            const opposites: Record<string, string> = { 'R': 'Y', 'Y': 'R', 'G': 'B', 'B': 'G' };
            opponentColors = [opposites[selectedHostColor]];
        } else {
            // 2 boxes (Teams). Opposite corners play together.
            if (selectedHostColor === 'R' || selectedHostColor === 'Y') {
                hostColors = ['R', 'Y'];
                opponentColors = ['G', 'B'];
            } else {
                hostColors = ['G', 'B'];
                opponentColors = ['R', 'Y'];
            }
        }

        onStartGame({ hostColors, opponentColors });
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.card}>
                            <Text style={styles.title}>Ludo Match Setup 🎲</Text>
                            
                            <Text style={styles.label}>Game Mode</Text>
                            <View style={styles.row}>
                                <TouchableOpacity 
                                    style={[styles.modeBtn, mode === '1box' && styles.modeBtnActive]} 
                                    onPress={() => setMode('1box')}
                                >
                                    <Ionicons name="person" size={20} color={mode === '1box' ? 'white' : '#64748B'} />
                                    <Text style={[styles.modeText, mode === '1box' && styles.modeTextActive]}>1v1 (Single Box)</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={[styles.modeBtn, mode === '2box' && styles.modeBtnActive]} 
                                    onPress={() => setMode('2box')}
                                >
                                    <Ionicons name="people" size={20} color={mode === '2box' ? 'white' : '#64748B'} />
                                    <Text style={[styles.modeText, mode === '2box' && styles.modeTextActive]}>2v2 (Dual Box)</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.label}>Choose Your Color</Text>
                            <View style={styles.colorGrid}>
                                {['R', 'G', 'Y', 'B'].map((color) => {
                                    const isSelected = mode === '1box' 
                                        ? selectedHostColor === color
                                        : (selectedHostColor === 'R' || selectedHostColor === 'Y') 
                                            ? (color === 'R' || color === 'Y') 
                                            : (color === 'G' || color === 'B');
                                    
                                    return (
                                        <TouchableOpacity 
                                            key={color}
                                            style={[
                                                styles.colorBtn, 
                                                { backgroundColor: LUDO_COLORS[color as keyof typeof LUDO_COLORS] },
                                                isSelected && styles.colorBtnActive
                                            ]}
                                            onPress={() => setSelectedHostColor(color)}
                                        >
                                            {isSelected && <Ionicons name="checkmark-circle" size={28} color="white" />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={styles.hintText}>
                                {mode === '1box' 
                                    ? "You will play with 1 color. Your opponent gets the opposite color." 
                                    : "You will play with 2 opposite colors. Your opponent gets the other 2."}
                            </Text>

                            <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
                                <Text style={styles.startBtnText}>Send Challenge</Text>
                                <Ionicons name="send" size={18} color="white" />
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'
    },
    card: {
        width: 320, backgroundColor: 'white', borderRadius: 24, padding: 24, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10
    },
    title: {
        fontSize: 22, fontWeight: 'bold', color: '#1E293B', textAlign: 'center', marginBottom: 24
    },
    label: {
        fontSize: 16, fontWeight: 'bold', color: '#475569', marginBottom: 12
    },
    row: {
        flexDirection: 'row', gap: 12, marginBottom: 24
    },
    modeBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC'
    },
    modeBtnActive: {
        backgroundColor: '#3B82F6', borderColor: '#3B82F6'
    },
    modeText: {
        fontWeight: 'bold', color: '#64748B'
    },
    modeTextActive: {
        color: 'white'
    },
    colorGrid: {
        flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16
    },
    colorBtn: {
        width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center',
        opacity: 0.5
    },
    colorBtnActive: {
        opacity: 1, borderWidth: 4, borderColor: '#1E293B', transform: [{scale: 1.1}]
    },
    hintText: {
        fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 24
    },
    startBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 16
    },
    startBtnText: {
        color: 'white', fontSize: 18, fontWeight: 'bold'
    }
});
