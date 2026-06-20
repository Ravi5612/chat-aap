import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface RacingSetupConfig {
    distance: 3000 | 10000 | -1; // -1 represents endless
    catchUp: boolean;
    powerUps: boolean;
    trafficDensity: 'easy' | 'normal' | 'hard';
}

interface Props {
    visible: boolean;
    onClose: () => void;
    onStartGame: (config: RacingSetupConfig) => void;
}

export default function RacingSetupModal({ visible, onClose, onStartGame }: Props) {
    const [distance, setDistance] = useState<3000 | 10000 | -1>(3000);
    const [catchUp, setCatchUp] = useState(true);
    const [powerUps, setPowerUps] = useState(true);
    const [trafficDensity, setTrafficDensity] = useState<'easy' | 'normal' | 'hard'>('normal');

    if (!visible) return null;

    return (
        <Modal transparent visible animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Racing Settings</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                            <Ionicons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Race Distance</Text>
                            <View style={styles.toggleRow}>
                                <TouchableOpacity 
                                    style={[styles.toggleBtn, distance === 3000 && styles.toggleBtnActive]}
                                    onPress={() => setDistance(3000)}
                                >
                                    <Text style={[styles.toggleBtnText, distance === 3000 && styles.toggleBtnTextActive]}>3,000m</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.toggleBtn, distance === 10000 && styles.toggleBtnActive]}
                                    onPress={() => setDistance(10000)}
                                >
                                    <Text style={[styles.toggleBtnText, distance === 10000 && styles.toggleBtnTextActive]}>10,000m</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.toggleBtn, distance === -1 && styles.toggleBtnActive]}
                                    onPress={() => setDistance(-1)}
                                >
                                    <Text style={[styles.toggleBtnText, distance === -1 && styles.toggleBtnTextActive]}>Endless</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.helperText}>Select the target finish line distance.</Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Traffic Density</Text>
                            <View style={styles.toggleRow}>
                                <TouchableOpacity 
                                    style={[styles.toggleBtn, trafficDensity === 'easy' && styles.toggleBtnActive]}
                                    onPress={() => setTrafficDensity('easy')}
                                >
                                    <Text style={[styles.toggleBtnText, trafficDensity === 'easy' && styles.toggleBtnTextActive]}>Easy</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.toggleBtn, trafficDensity === 'normal' && styles.toggleBtnActive]}
                                    onPress={() => setTrafficDensity('normal')}
                                >
                                    <Text style={[styles.toggleBtnText, trafficDensity === 'normal' && styles.toggleBtnTextActive]}>Normal</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.toggleBtn, trafficDensity === 'hard' && styles.toggleBtnActive]}
                                    onPress={() => setTrafficDensity('hard')}
                                >
                                    <Text style={[styles.toggleBtnText, trafficDensity === 'hard' && styles.toggleBtnTextActive]}>Hard</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.helperText}>Higher density means obstacles appear more frequently.</Text>
                        </View>

                        <View style={styles.switchSection}>
                            <View style={styles.switchTextContainer}>
                                <Text style={styles.switchTitle}>Catch-Up (Rubber Banding)</Text>
                                <Text style={styles.switchDesc}>Gives a speed boost to the trailing player (>300m behind) to keep the race close.</Text>
                            </View>
                            <Switch 
                                value={catchUp} 
                                onValueChange={setCatchUp}
                                trackColor={{ false: '#CBD5E1', true: '#3B82F6' }}
                            />
                        </View>

                        <View style={styles.switchSection}>
                            <View style={styles.switchTextContainer}>
                                <Text style={styles.switchTitle}>Power-ups & Nitro</Text>
                                <Text style={styles.switchDesc}>Spawn coins and manual nitro boosts on the track.</Text>
                            </View>
                            <Switch 
                                value={powerUps} 
                                onValueChange={setPowerUps}
                                trackColor={{ false: '#CBD5E1', true: '#3B82F6' }}
                            />
                        </View>

                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity 
                            style={styles.startBtn}
                            onPress={() => {
                                onStartGame({ distance, catchUp, powerUps, trafficDensity });
                                onClose();
                            }}
                        >
                            <Ionicons name="play" size={20} color="white" style={{ marginRight: 8 }} />
                            <Text style={styles.startBtnText}>Start Race</Text>
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
    toggleRow: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 4,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 8,
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
    switchSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    switchTextContainer: {
        flex: 1,
        paddingRight: 16,
    },
    switchTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#334155',
        marginBottom: 4,
    },
    switchDesc: {
        fontSize: 13,
        color: '#94A3B8',
        lineHeight: 18,
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
