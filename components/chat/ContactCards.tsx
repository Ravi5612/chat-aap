import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const ContactsPermissionCard = ({ requestPermission }: { requestPermission: () => void }) => (
    <View style={styles.container}>
        <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
                <Ionicons name="people-outline" size={32} color="#F68537" />
            </View>
            <Text style={styles.emptyTitle}>Contacts Not Synced</Text>
            <Text style={styles.emptyText}>
                Aapke doston ko dhoondhne ke liye Contacts permission allow karein.
            </Text>
            <TouchableOpacity 
                onPress={requestPermission}
                style={styles.permissionBtn}
            >
                <Text style={styles.permissionBtnText}>Allow Permission</Text>
            </TouchableOpacity>
        </View>
    </View>
);

export const EmptyContactsCard = () => (
    <View style={styles.container}>
        <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
                <Ionicons name="book-outline" size={32} color="#F68537" />
            </View>
            <Text style={styles.emptyTitle}>No Contacts Found</Text>
            <Text style={styles.emptyText}>
                Aapke phone contacts mein se abhi tak kisi ne app join nahi kiya hai. Apne doston ko invite karein!
            </Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        marginHorizontal: 16,
        marginTop: 10,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)'
    },
    emptyCard: {
        backgroundColor: 'white',
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFF7ED',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 6,
    },
    emptyText: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 19,
        paddingHorizontal: 10,
    },
    permissionBtn: {
        marginTop: 16,
        backgroundColor: '#F68537',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    permissionBtnText: { color: 'white', fontWeight: 'bold' }
});
