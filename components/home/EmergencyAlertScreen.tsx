import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface EmergencyAlertScreenProps {
    distanceKm?: number;
    onIgnore: () => void;
    onAccept: () => void;
}

export const EmergencyAlertScreen = ({ distanceKm, onIgnore, onAccept }: EmergencyAlertScreenProps) => {
    return (
        <View style={styles.alertContent}>
            <View style={[styles.warningIconContainer, styles.pulseAnimation]}>
                <MaterialCommunityIcons name="alert-decagram" size={64} color="#EF4444" />
            </View>
            
            <Text style={styles.emergencyTitle}>🚨 EMERGENCY SOS 🚨</Text>
            <Text style={styles.emergencySubtitle}>
                Someone within {distanceKm?.toFixed(1)} KM is in danger and needs your help!
            </Text>

            <View style={styles.actionButtonsRow}>
                <TouchableOpacity style={styles.ignoreBtn} onPress={onIgnore}>
                    <Text style={styles.ignoreText}>IGNORE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.helpBtn} onPress={onAccept}>
                    <Text style={styles.helpText}>ACCEPT MISSION</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    alertContent: {
        paddingVertical: 40,
        alignItems: 'center',
        width: '100%',
    },
    warningIconContainer: {
        marginBottom: 20,
    },
    pulseAnimation: {},
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
});
