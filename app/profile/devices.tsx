import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { AppStorage } from '@/lib/storage';

export default function DevicesScreen() {
    const router = useRouter();
    const currentUser = useAuthStore(state => state.user);
    const [devices, setDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

    useEffect(() => {
        loadDevices();
    }, []);

    const loadDevices = async () => {
        if (!currentUser?.id) return;
        setLoading(true);
        try {
            const localDeviceId = await AppStorage.getItemAsync('unique_device_id');
            setCurrentDeviceId(localDeviceId);

            const { data, error } = await supabase
                .from('user_devices')
                .select('*')
                .eq('user_id', currentUser.id)
                .eq('is_active', true)
                .order('last_active', { ascending: false });

            if (error) throw error;
            setDevices(data || []);
        } catch (error) {
            console.error('Error fetching devices:', error);
            Alert.alert('Error', 'Failed to load linked devices');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoteLogout = (device: any) => {
        Alert.alert(
            'Log Out Device',
            `Are you sure you want to log out of ${device.device_name}? This will instantly lock the app on that device.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('user_devices')
                                .update({ is_active: false })
                                .eq('id', device.id);

                            if (error) throw error;
                            
                            setDevices(prev => prev.filter(d => d.id !== device.id));
                            Alert.alert('Success', 'Device has been logged out successfully.');
                        } catch (error) {
                            console.error('Remote logout error:', error);
                            Alert.alert('Error', 'Failed to log out device.');
                        }
                    }
                }
            ]
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFDFB' }}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Linked Devices</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 24 }}>
                <View style={{ alignItems: 'center', marginBottom: 32 }}>
                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                        <Ionicons name="hardware-chip" size={40} color="#F68537" />
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 }}>Active Sessions</Text>
                    <Text style={{ textAlign: 'center', color: '#6B7280', fontSize: 14, lineHeight: 22 }}>
                        Here is a list of devices that have logged into your account. If you see an unfamiliar device, log it out immediately.
                    </Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#F68537" style={{ marginTop: 40 }} />
                ) : (
                    devices.map((device) => {
                        const isCurrentDevice = device.device_id === currentDeviceId;

                        return (
                            <View key={device.id} style={[styles.deviceCard, isCurrentDevice && styles.currentDeviceCard]}>
                                <View style={styles.deviceIconBg}>
                                    <Ionicons name={device.device_name.toLowerCase().includes('iphone') || device.device_name.toLowerCase().includes('android') ? "phone-portrait" : "desktop"} size={24} color={isCurrentDevice ? "#10B981" : "#F68537"} />
                                </View>
                                
                                <View style={{ flex: 1, marginRight: 12 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.deviceName}>{device.device_name || 'Unknown Device'}</Text>
                                        {isCurrentDevice && (
                                            <View style={styles.currentBadge}>
                                                <Text style={styles.currentBadgeText}>This Device</Text>
                                            </View>
                                        )}
                                    </View>
                                    
                                    {device.last_location && device.last_location !== 'Unknown Location' && (
                                        <View style={styles.infoRow}>
                                            <Ionicons name="location" size={12} color="#9CA3AF" />
                                            <Text style={styles.infoText}>{device.last_location}</Text>
                                        </View>
                                    )}
                                    
                                    <View style={styles.infoRow}>
                                        <Ionicons name="time" size={12} color="#9CA3AF" />
                                        <Text style={styles.infoText}>Active: {formatDate(device.last_active)}</Text>
                                    </View>

                                    <View style={styles.infoRow}>
                                        <Ionicons name="information-circle" size={12} color="#9CA3AF" />
                                        <Text style={styles.infoText}>OS: {device.os_version || 'Unknown'}</Text>
                                    </View>
                                </View>

                                {!isCurrentDevice && (
                                    <TouchableOpacity 
                                        style={styles.logoutBtn}
                                        onPress={() => handleRemoteLogout(device)}
                                    >
                                        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFDFB',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerIcon: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    deviceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F3F4F6'
    },
    currentDeviceCard: {
        borderColor: '#10B981',
        backgroundColor: '#F0FDF4'
    },
    deviceIconBg: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFF7ED',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    deviceName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    currentBadge: {
        backgroundColor: '#10B981',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginLeft: 8,
        marginBottom: 4,
    },
    currentBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    infoText: {
        fontSize: 12,
        color: '#6B7280',
        marginLeft: 4,
    },
    logoutBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FCA5A5'
    }
});

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
