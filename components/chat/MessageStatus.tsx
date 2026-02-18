import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageStatusProps {
    status: 'sending' | 'sent' | 'delivered' | 'read';
}

export default function MessageStatus({ status }: MessageStatusProps) {
    if (status === 'sending') {
        return (
            <View className="ml-1">
                <ActivityIndicator size="small" color="#94a3b8" />
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
