import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, TouchableWithoutFeedback, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LUDO_COLORS } from '@/utils/ludoConstants';

export interface LudoSetupConfig {
    hostColors: string[];
    opponentColors: string[];
    rules: {
        tokensCount: number;
        blockRule: boolean;
        tripleSixPenalty: boolean;
        captureBonus: boolean;
    };
}

interface Props {
    visible: boolean;
    onClose: () => void;
    onStartGame: (config: LudoSetupConfig) => void;
}

export default function LudoSetupModal({ visible, onClose, onStartGame }: Props) {
    const [mode, setMode] = useState<'1box' | '2box'>('1box');
    const [selectedHostColor, setSelectedHostColor] = useState<string>('R');
    const [tokensCount, setTokensCount] = useState<number>(4);
    const [blockRule, setBlockRule] = useState<boolean>(true);
    const [tripleSixPenalty, setTripleSixPenalty] = useState<boolean>(true);
    const [captureBonus, setCaptureBonus] = useState<boolean>(true);

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

        onStartGame({ 
            hostColors, 
            opponentColors,
            rules: { tokensCount, blockRule, tripleSixPenalty, captureBonus }
        });
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

                            <View style={styles.divider} />
                            <Text style={styles.label}>Pro Settings ⚙️</Text>
                            
                            <ScrollView style={styles.settingsScroll} showsVerticalScrollIndicator={false}>
                                <View style={styles.settingRow}>
                                    <View>
                                        <Text style={styles.settingTitle}>Quick Mode (Tokens)</Text>
                                        <Text style={styles.settingDesc}>Play with 2 or 4 tokens per color</Text>
                                    </View>
                                    <View style={styles.tokenToggle}>
                                        <TouchableOpacity onPress={() => setTokensCount(2)} style={[styles.tokenBtn, tokensCount === 2 && styles.tokenBtnActive]}>
                                            <Text style={[styles.tokenBtnText, tokensCount === 2 && {color: 'white'}]}>2</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => setTokensCount(4)} style={[styles.tokenBtn, tokensCount === 4 && styles.tokenBtnActive]}>
                                            <Text style={[styles.tokenBtnText, tokensCount === 4 && {color: 'white'}]}>4</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.settingRow}>
                                    <View style={{flex: 1}}>
                                        <Text style={styles.settingTitle}>Strong Block Rule</Text>
                                        <Text style={styles.settingDesc}>2 tokens on same cell cannot be cut</Text>
                                    </View>
                                    <Switch value={blockRule} onValueChange={setBlockRule} trackColor={{ true: '#10B981' }} />
                                </View>

                                <View style={styles.settingRow}>
                                    <View style={{flex: 1}}>
                                        <Text style={styles.settingTitle}>Triple Six Penalty</Text>
                                        <Text style={styles.settingDesc}>Turn cancelled on 3 consecutive sixes</Text>
                                    </View>
                                    <Switch value={tripleSixPenalty} onValueChange={setTripleSixPenalty} trackColor={{ true: '#10B981' }} />
                                </View>

                                <View style={styles.settingRow}>
                                    <View style={{flex: 1}}>
                                        <Text style={styles.settingTitle}>Capture Bonus</Text>
                                        <Text style={styles.settingDesc}>Extra turn on cutting opponent</Text>
                                    </View>
                                    <Switch value={captureBonus} onValueChange={setCaptureBonus} trackColor={{ true: '#10B981' }} />
                                </View>
                            </ScrollView>

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
    },
    divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 16 },
    settingsScroll: { maxHeight: 200, marginBottom: 16 },
    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    settingTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
    settingDesc: { fontSize: 12, color: '#64748B', marginTop: 2 },
    tokenToggle: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 8, padding: 2 },
    tokenBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    tokenBtnActive: { backgroundColor: '#3B82F6' },
    tokenBtnText: { fontWeight: 'bold', color: '#64748B' }
});
