import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { useDevices } from '@/hooks/profile/useDevices';
import { DeviceCard } from '@/components/profile/DeviceCard';

export default function DevicesScreen() {
    const router = useRouter();
    const currentUser = useAuthStore(state => state.user);
    const { devices, loading, currentDeviceId, handleRemoteLogout } = useDevices(currentUser);

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
                    devices.map((device) => (
                        <DeviceCard 
                            key={device.id} 
                            device={device} 
                            isCurrentDevice={device.device_id === currentDeviceId} 
                            onLogout={handleRemoteLogout} 
                        />
                    ))
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
    }
});

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
