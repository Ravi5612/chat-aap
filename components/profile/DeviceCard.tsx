import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
    device: any;
    isCurrentDevice: boolean;
    onLogout: (device: any) => void;
}

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const DeviceCard: React.FC<Props> = ({ device, isCurrentDevice, onLogout }) => {
    return (
        <View style={[styles.deviceCard, isCurrentDevice && styles.currentDeviceCard]}>
            <View style={styles.deviceIconBg}>
                <Ionicons name={device.device_name?.toLowerCase().includes('iphone') || device.device_name?.toLowerCase().includes('android') ? "phone-portrait" : "desktop"} size={24} color={isCurrentDevice ? "#10B981" : "#F68537"} />
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
                    onPress={() => onLogout(device)}
                >
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
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
