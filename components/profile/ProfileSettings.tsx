import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileSettings() {
    const router = useRouter();

    return (
        <View style={{ padding: 24 }}>
            <Text style={styles.sectionTitle}>ACCOUNT SETTINGS</Text>

            <TouchableOpacity onPress={() => router.push('/edit-profile')} style={styles.settingsItem}>
                <View style={[styles.settingsIconBg, { backgroundColor: '#FFF7ED' }]}>
                    <Ionicons name="person-outline" size={20} color="#F68537" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.settingsTitle}>Profile Information</Text>
                    <Text style={styles.settingsSubtitle}>Update your personal details</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity 
                onPress={() => router.push('/notification-settings' as any)}
                style={styles.settingsItem}
            >
                <View style={[styles.settingsIconBg, { backgroundColor: '#FFF7ED' }]}>
                    <Ionicons name="notifications-outline" size={20} color="#F68537" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.settingsTitle}>Notifications</Text>
                    <Text style={styles.settingsSubtitle}>Manage sounds and alerts</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/privacy-safety')} style={styles.settingsItem}>
                <View style={[styles.settingsIconBg, { backgroundColor: '#FFF7ED' }]}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#F68537" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.settingsTitle}>Privacy & Safety</Text>
                    <Text style={styles.settingsSubtitle}>Secure your account presence</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingsItem}>
                <View style={[styles.settingsIconBg, { backgroundColor: '#FFF7ED' }]}>
                    <Ionicons name="help-circle-outline" size={20} color="#F68537" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.settingsTitle}>Help Center</Text>
                    <Text style={styles.settingsSubtitle}>FAQs and support contact</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#9CA3AF',
        marginBottom: 16,
        letterSpacing: 1,
    },
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    settingsIconBg: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    settingsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#374151',
    },
    settingsSubtitle: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
});
