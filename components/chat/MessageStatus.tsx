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
            <View className="flex-row ml-1">
                <Ionicons name="checkmark-done" size={16} color="#94a3b8" />
            </View>
        );
    }

    if (status === 'read') {
        return (
            <View className="flex-row ml-1">
                <Ionicons name="checkmark-done" size={16} color="#F68537" />
            </View>
        );
    }

    return null;
}
