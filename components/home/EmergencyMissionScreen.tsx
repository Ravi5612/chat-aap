import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface EmergencyMissionScreenProps {
    victimName: string;
    victimPhone?: string | null;
    victimEmail?: string | null;
    sharePhone?: boolean;
    shareEmail?: boolean;
    onOpenMaps: () => void;
    onIHelped: () => void;
    onAbort: () => void;
}

export const EmergencyMissionScreen = ({
    victimName, victimPhone, victimEmail, sharePhone, shareEmail,
    onOpenMaps, onIHelped, onAbort
}: EmergencyMissionScreenProps) => {
    return (
        <View style={styles.helpingContent}>
            <View style={styles.headerRow}>
                <Text style={styles.missionTitle}>Mission Active</Text>
                <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                </View>
            </View>

            <View style={styles.detailsBox}>
                <Text style={styles.victimName}>{victimName}</Text>
                
                {sharePhone && victimPhone && (
                    <TouchableOpacity style={styles.detailRow} onPress={() => Linking.openURL(`tel:${victimPhone}`)}>
                        <Ionicons name="call" size={20} color="#10B981" />
                        <Text style={styles.detailText}>{victimPhone}</Text>
                    </TouchableOpacity>
                )}
                
                {shareEmail && victimEmail && (
                    <View style={styles.detailRow}>
                        <Ionicons name="mail" size={20} color="#F59E0B" />
                        <Text style={styles.detailText}>{victimEmail}</Text>
                    </View>
                )}
            </View>

            <TouchableOpacity style={styles.mapBtn} onPress={onOpenMaps}>
                <MaterialCommunityIcons name="google-maps" size={24} color="white" />
                <Text style={styles.mapText}>Get Directions to Location</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iHelpedBtn} onPress={onIHelped}>
                <MaterialCommunityIcons name="check-decagram" size={24} color="white" />
                <Text style={styles.iHelpedText}>I HAVE HELPED THEM</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.abortBtn} onPress={onAbort}>
                <Text style={styles.abortText}>Abort Mission</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    helpingContent: {
        width: '100%',
        alignItems: 'center',
    },
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
