import React from 'react';
import { View, Modal, StyleSheet } from 'react-native';
import { useEmergencyReceiver } from '@/hooks/emergency/useEmergencyReceiver';
import { EmergencyAlertScreen } from './EmergencyAlertScreen';
import { EmergencyMissionScreen } from './EmergencyMissionScreen';

export default function EmergencyReceiverModal() {
    const {
        user,
        activeEmergency,
        isHelping,
        handleIgnore,
        handleAcceptHelp,
        handleIHelped,
        openMaps
    } = useEmergencyReceiver();

    if (!activeEmergency || !user) return null;

    return (
        <Modal
            visible={!!activeEmergency}
            transparent={true}
            animationType="fade"
            onRequestClose={() => {}} // Disable back button closing
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, isHelping ? styles.helpingContentWrapper : styles.alertContentWrapper]}>
                    {!isHelping ? (
                        <EmergencyAlertScreen 
                            distanceKm={activeEmergency.distance_km}
                            onIgnore={handleIgnore}
                            onAccept={handleAcceptHelp}
                        />
                    ) : (
                        <EmergencyMissionScreen
                            victimName={activeEmergency.victim_name || 'Unknown User'}
                            victimPhone={activeEmergency.victim_phone}
                            victimEmail={activeEmergency.victim_email}
                            sharePhone={activeEmergency.share_phone}
                            shareEmail={activeEmergency.share_email}
                            onOpenMaps={openMaps}
                            onIHelped={handleIHelped}
                            onAbort={handleIgnore}
                        />
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
    },
    alertContentWrapper: {
        borderColor: '#EF4444',
    },
    helpingContentWrapper: {
        borderColor: '#3B82F6',
        backgroundColor: '#111827',
    },
});
