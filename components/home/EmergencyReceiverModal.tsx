import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Vibration, Linking, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEmergencyStore } from '@/store/useEmergencyStore';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

// Loud vibration pattern
const VIBRATION_PATTERN = [0, 1000, 500, 1000, 500, 1000, 500, 1000]; 

export default function EmergencyReceiverModal() {
    const { user } = useAuthStore();
    const { activeEmergency, isVibrating, stopVibration, setActiveEmergency } = useEmergencyStore();
    
    // UI states
    const [isHelping, setIsHelping] = useState(false);

    useEffect(() => {
        if (isVibrating) {
            Vibration.vibrate(VIBRATION_PATTERN, true); // loop true
        } else {
            Vibration.cancel();
        }
        return () => Vibration.cancel();
    }, [isVibrating]);

    if (!activeEmergency || !user) return null;

    const handleIgnore = async () => {
        stopVibration();
        // Record the ignore in DB
        await supabase.from('emergency_responses').insert({
            emergency_id: activeEmergency.id,
            warrior_id: user.id,
            status: 'ignored'
        });
        // Clear from screen
        setActiveEmergency(null);
        setIsHelping(false);
    };

    const handleAcceptHelp = async () => {
        stopVibration();
        // Record the accept in DB
        await supabase.from('emergency_responses').insert({
            emergency_id: activeEmergency.id,
            warrior_id: user.id,
            status: 'helping'
        });
        // Transition UI
        setIsHelping(true);
    };

    const handleIHelped = async () => {
        // Here we mark it waiting for victim verification
        await supabase.from('emergency_responses').update({ status: 'completed' })
            .eq('emergency_id', activeEmergency.id)
            .eq('warrior_id', user.id);
            
        Alert.alert('Mission Pending Verification', 'The user has been asked to verify your help. Once they verify, you will get the award!');
        setActiveEmergency(null);
        setIsHelping(false);
    };

    const openMaps = () => {
        const url = `https://www.google.com/maps/search/?api=1&query=${activeEmergency.latitude},${activeEmergency.longitude}`;
        Linking.openURL(url);
    };

    return (
        <Modal
            visible={!!activeEmergency}
            transparent={true}
            animationType="fade"
            onRequestClose={() => {}} // Disable back button closing
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, isHelping ? styles.helpingContent : styles.alertContent]}>
                    
                    {!isHelping ? (
                        <>
                            {/* THE ALERT SCREEN */}
                            <View style={[styles.warningIconContainer, styles.pulseAnimation]}>
                                <MaterialCommunityIcons name="alert-decagram" size={64} color="#EF4444" />
                            </View>
                            
                            <Text style={styles.emergencyTitle}>🚨 EMERGENCY SOS 🚨</Text>
                            <Text style={styles.emergencySubtitle}>
                                Someone within {activeEmergency.distance_km?.toFixed(1)} KM is in danger and needs your help!
                            </Text>

                            <View style={styles.actionButtonsRow}>
                                <TouchableOpacity style={styles.ignoreBtn} onPress={handleIgnore}>
                                    <Text style={styles.ignoreText}>IGNORE</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.helpBtn} onPress={handleAcceptHelp}>
                                    <Text style={styles.helpText}>ACCEPT MISSION</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            {/* THE ACTIVE MISSION SCREEN */}
                            <View style={styles.headerRow}>
                                <Text style={styles.missionTitle}>Mission Active</Text>
                                <View style={styles.liveBadge}>
                                    <View style={styles.liveDot} />
                                    <Text style={styles.liveText}>LIVE</Text>
                                </View>
                            </View>

                            <View style={styles.detailsBox}>
                                <Text style={styles.victimName}>{activeEmergency.victim_name}</Text>
                                
                                {activeEmergency.share_phone && activeEmergency.victim_phone && (
                                    <TouchableOpacity style={styles.detailRow} onPress={() => Linking.openURL(`tel:${activeEmergency.victim_phone}`)}>
                                        <Ionicons name="call" size={20} color="#10B981" />
                                        <Text style={styles.detailText}>{activeEmergency.victim_phone}</Text>
                                    </TouchableOpacity>
                                )}
                                
                                {activeEmergency.share_email && activeEmergency.victim_email && (
                                    <View style={styles.detailRow}>
                                        <Ionicons name="mail" size={20} color="#F59E0B" />
                                        <Text style={styles.detailText}>{activeEmergency.victim_email}</Text>
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity style={styles.mapBtn} onPress={openMaps}>
                                <MaterialCommunityIcons name="google-maps" size={24} color="white" />
                                <Text style={styles.mapText}>Get Directions to Location</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.iHelpedBtn} onPress={handleIHelped}>
                                <MaterialCommunityIcons name="check-decagram" size={24} color="white" />
                                <Text style={styles.iHelpedText}>I HAVE HELPED THEM</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.abortBtn} onPress={handleIgnore}>
                                <Text style={styles.abortText}>Abort Mission</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#1F2937',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#EF4444',
    },
    alertContent: {
        paddingVertical: 40,
    },
    helpingContent: {
        borderColor: '#3B82F6',
        backgroundColor: '#111827',
    },
    warningIconContainer: {
        marginBottom: 20,
    },
    pulseAnimation: {
        // We could add Reanimated pulse here later
    },
    emergencyTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: '#EF4444',
        marginBottom: 12,
        textAlign: 'center',
    },
    emergencySubtitle: {
        fontSize: 16,
        color: '#D1D5DB',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    actionButtonsRow: {
        flexDirection: 'row',
        width: '100%',
        gap: 16,
    },
    ignoreBtn: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: '#374151',
        alignItems: 'center',
    },
    ignoreText: {
        color: '#9CA3AF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    helpBtn: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
    },
    helpText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    // Helping UI Styles
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        alignItems: 'center',
        marginBottom: 24,
    },
    missionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.5)',
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        marginRight: 6,
    },
    liveText: {
        color: '#EF4444',
        fontWeight: 'bold',
        fontSize: 12,
    },
    detailsBox: {
        width: '100%',
        backgroundColor: '#1F2937',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    victimName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        backgroundColor: '#374151',
        padding: 12,
        borderRadius: 8,
    },
    detailText: {
        color: 'white',
        fontSize: 16,
        marginLeft: 12,
        fontWeight: '600',
    },
    mapBtn: {
        width: '100%',
        backgroundColor: '#3B82F6',
        paddingVertical: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    mapText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    },
    iHelpedBtn: {
        width: '100%',
        backgroundColor: '#10B981',
        paddingVertical: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    iHelpedText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 16,
        marginLeft: 8,
    },
    abortBtn: {
        padding: 12,
    },
    abortText: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '600',
    }
});
