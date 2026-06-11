import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Switch, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

export default function SOSButton() {
    const user = useAuthStore(state => state.user);
    const profile = useAuthStore(state => state.profile);
    const [modalVisible, setModalVisible] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sharePhone, setSharePhone] = useState(true);
    const [shareEmail, setShareEmail] = useState(false);
    const [activeEmergencyId, setActiveEmergencyId] = useState<string | null>(null);

    // Draggable Button logic
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const offsetX = useSharedValue(0);
    const offsetY = useSharedValue(0);

    const panGesture = React.useMemo(() => Gesture.Pan()
        .onUpdate((event) => {
            translateX.value = offsetX.value + event.translationX;
            translateY.value = offsetY.value + event.translationY;
        })
        .onEnd(() => {
            offsetX.value = translateX.value;
            offsetY.value = translateY.value;
        }),
    [translateX, translateY, offsetX, offsetY]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: withSpring(translateX.value, { damping: 15 }) },
            { translateY: withSpring(translateY.value, { damping: 15 }) },
        ],
    }));

    // Load active emergency on mount
    React.useEffect(() => {
        if (!user) return;
        const loadActive = async () => {
            const { data } = await supabase.from('emergencies')
                .select('id')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .maybeSingle();
            if (data) setActiveEmergencyId(data.id);
        };
        loadActive();
    }, [user]);

    const handleSendSOS = async () => {
        if (!user) return;
        setIsSending(true);

        try {
            // Get current location
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required to send SOS.');
                setIsSending(false);
                return;
            }

            const locationPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000));
            let location: any;
            try {
                location = await Promise.race([locationPromise, timeoutPromise]);
            } catch (e) {
                location = await Location.getLastKnownPositionAsync();
                if (!location) throw new Error('Failed to get location in time.');
            }
            
            const { data, error } = await supabase.from('emergencies').insert({
                user_id: user.id,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                share_phone: sharePhone,
                share_email: shareEmail,
                status: 'active'
            }).select('id').single();

            if (error) throw error;

            setActiveEmergencyId(data.id);
            setModalVisible(false);
            Alert.alert('🚨 SOS SENT!', 'Warriors nearby have been alerted and are on their way.');
        } catch (error: any) {
            console.error('Error sending SOS:', error);
            Alert.alert('Error', 'Failed to send SOS alert. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    const handleCancelSOS = async () => {
        if (!activeEmergencyId) return;
        await supabase.from('emergencies').update({ status: 'resolved' }).eq('id', activeEmergencyId);
        setActiveEmergencyId(null);
        setModalVisible(false);
        Alert.alert('SOS Cancelled', 'The emergency alert has been turned off.');
    };

    const handleVerifyHelp = async () => {
        if (!activeEmergencyId) return;
        
        // Find who helped and increment their missions
        const { data: responses } = await supabase.from('emergency_responses')
            .select('warrior_id')
            .eq('emergency_id', activeEmergencyId)
            .eq('status', 'completed');
            
        if (responses && responses.length > 0) {
            for (const resp of responses) {
                // Increment missions_completed using RPC or fetch & update
                const { data: wProfile } = await supabase.from('profiles').select('missions_completed').eq('id', resp.warrior_id).single();
                if (wProfile) {
                    await supabase.from('profiles').update({ missions_completed: (wProfile.missions_completed || 0) + 1 }).eq('id', resp.warrior_id);
                }
            }
            Alert.alert('Hero Verified!', 'You have confirmed the help. The Warrior has been awarded a mission point! 🎖️');
        } else {
            Alert.alert('No Warriors', 'No warriors have marked this mission as completed yet.');
        }

        await supabase.from('emergencies').update({ status: 'resolved' }).eq('id', activeEmergencyId);
        setActiveEmergencyId(null);
        setModalVisible(false);
    };

    return (
        <>
            {/* Floating SOS Button */}
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.sosButton, animatedStyle, activeEmergencyId ? { backgroundColor: '#B91C1C', borderWidth: 2, borderColor: '#FECACA' } : {}]}>
                    <TouchableOpacity 
                        style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                        onPress={() => setModalVisible(true)}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="car-emergency" size={28} color="white" />
                        <Text style={styles.sosText}>{activeEmergencyId ? 'LIVE' : 'SOS'}</Text>
                    </TouchableOpacity>
                </Animated.View>
            </GestureDetector>

            {/* SOS Trigger Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {activeEmergencyId ? (
                            // ACTIVE EMERGENCY VIEW
                            <>
                                <View style={styles.warningIconContainer}>
                                    <Ionicons name="shield-checkmark" size={48} color="#10B981" />
                                </View>
                                <Text style={styles.modalTitle}>Help is on the way!</Text>
                                <Text style={styles.modalSubtitle}>
                                    Your SOS alert is currently LIVE. Warriors in your area can see your location.
                                </Text>

                                <View style={styles.actionButtons}>
                                    <TouchableOpacity 
                                        style={styles.cancelButton}
                                        onPress={handleCancelSOS}
                                    >
                                        <Text style={styles.cancelText}>False Alarm (Cancel)</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={[styles.sendButton, { backgroundColor: '#10B981' }]}
                                        onPress={handleVerifyHelp}
                                    >
                                        <Text style={styles.sendText}>I RECEIVED HELP</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            // NEW EMERGENCY VIEW
                            <>
                                <View style={styles.warningIconContainer}>
                                    <Ionicons name="warning" size={48} color="#EF4444" />
                                </View>
                                
                                <Text style={styles.modalTitle}>Are you really in trouble?</Text>
                                <Text style={styles.modalSubtitle}>
                                    This will send a loud alert to all Warriors within 5KM of your location. Do not use this for fun.
                                </Text>

                                <View style={styles.optionsContainer}>
                                    <Text style={styles.optionsTitle}>What to share?</Text>
                                    
                                    <View style={styles.optionRow}>
                                        <View style={styles.optionLeft}>
                                            <Ionicons name="location" size={20} color="#3B82F6" />
                                            <Text style={styles.optionText}>Live Location (Required)</Text>
                                        </View>
                                        <Switch value={true} disabled={true} trackColor={{ true: '#BFDBFE' }} thumbColor="#3B82F6" />
                                    </View>

                                    <View style={styles.optionRow}>
                                        <View style={styles.optionLeft}>
                                            <Ionicons name="call" size={20} color="#10B981" />
                                            <Text style={styles.optionText}>Phone Number: {profile?.phone || 'Not set'}</Text>
                                        </View>
                                        <Switch 
                                            value={sharePhone} 
                                            onValueChange={setSharePhone} 
                                            disabled={!profile?.phone}
                                            trackColor={{ true: '#D1FAE5' }} 
                                            thumbColor={sharePhone ? "#10B981" : "#FFFFFF"} 
                                        />
                                    </View>

                                    <View style={styles.optionRow}>
                                        <View style={styles.optionLeft}>
                                            <Ionicons name="mail" size={20} color="#F59E0B" />
                                            <Text style={styles.optionText}>Email: {profile?.email || 'Not set'}</Text>
                                        </View>
                                        <Switch 
                                            value={shareEmail} 
                                            onValueChange={setShareEmail} 
                                            trackColor={{ true: '#FEF3C7' }} 
                                            thumbColor={shareEmail ? "#F59E0B" : "#FFFFFF"} 
                                        />
                                    </View>
                                </View>

                                <View style={styles.actionButtons}>
                                    <TouchableOpacity 
                                        style={styles.cancelButton}
                                        onPress={() => setModalVisible(false)}
                                        disabled={isSending}
                                    >
                                        <Text style={styles.cancelText}>Cancel</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={[styles.sendButton, isSending && { opacity: 0.7 }]}
                                        onPress={handleSendSOS}
                                        disabled={isSending}
                                    >
                                        {isSending ? (
                                            <ActivityIndicator size="small" color="white" />
                                        ) : (
                                            <Text style={styles.sendText}>SEND SOS NOW</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    sosButton: {
        position: 'absolute',
        bottom: 120,
        right: 20,
        backgroundColor: '#EF4444',
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        zIndex: 100,
    },
    sosText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
        marginTop: -2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        alignItems: 'center',
    },
    warningIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    optionsContainer: {
        width: '100%',
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
    },
    optionsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 16,
    },
    optionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    optionText: {
        marginLeft: 12,
        fontSize: 15,
        color: '#4B5563',
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4B5563',
    },
    sendButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: '#EF4444',
        alignItems: 'center',
    },
    sendText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
});
