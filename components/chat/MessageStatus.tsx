import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageStatusProps {
    status: 'sending' | 'pending' | 'sent' | 'delivered' | 'read';
}

export default function MessageStatus({ status }: MessageStatusProps) {
    if (status === 'sending' || status === 'pending') {
        return (
            <View style={{ marginLeft: 2 }}>
                <Ionicons name="time-outline" size={14} color="#94a3b8" />
            </View>
        );
    }

    if (status === 'sent') {
        return (
            <View className="ml-1">
                <Ionicons name="checkmark" size={16} color="#94a3b8" />
            </View>
        );
    }

    if (status === 'delivered') {
        return (
            <View style={{ flexDirection: 'row', marginLeft: 2 }}>
                <Ionicons name="checkmark" size={14} color="#94a3b8" />
                <Ionicons name="checkmark" size={14} color="#94a3b8" style={{ marginLeft: -5 }} />
            </View>
        );
    }

    if (status === 'read') {
        return (
            <View style={{ flexDirection: 'row', marginLeft: 2 }}>
                <Ionicons name="checkmark" size={14} color="#10B981" />
                <Ionicons name="checkmark" size={14} color="#10B981" style={{ marginLeft: -5 }} />
            </View>
        );
    }

    return null;
}
