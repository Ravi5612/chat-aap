import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CallListEmptyState() {
    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <Ionicons name="call" size={80} color="#F68537" />
            </View>
            <Text style={styles.title}>No recent calls</Text>
            <Text style={styles.subtitle}>
                Start a voice or video call with your friends to stay connected.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        marginTop: 50,
    },
    iconContainer: {
        backgroundColor: '#FFF7ED',
        padding: 40,
        borderRadius: 9999,
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    subtitle: {
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 8,
    }
});
