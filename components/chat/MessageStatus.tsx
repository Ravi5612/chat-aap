import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageStatusProps {
    status: 'sending' | 'pending' | 'sent' | 'delivered' | 'read';
}

export default React.memo(function MessageStatus({ status }: MessageStatusProps) {
    if (status === 'sending' || status === 'pending') {
        return (
            <View style={styles.container}>
                <Ionicons name="time-outline" size={14} color="#94a3b8" />
            </View>
        );
    }

    if (status === 'sent') {
        return (
            <View style={styles.container}>
                <Ionicons name="checkmark" size={16} color="#94a3b8" />
            </View>
        );
    }

    if (status === 'delivered') {
        return (
            <View style={styles.container}>
                <Ionicons name="checkmark-done" size={16} color="#94a3b8" />
            </View>
        );
    }

    if (status === 'read') {
        return (
            <View style={styles.container}>
                <Ionicons name="checkmark-done" size={16} color="#10B981" />
            </View>
        );
    }

    return null;
});

const styles = StyleSheet.create({
    container: {
        marginLeft: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
    }
});
