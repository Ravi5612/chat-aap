import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ReplyPreviewProps {
    replyingTo: any;
    onCancel: () => void;
}

export default function ReplyPreview({ replyingTo, onCancel }: ReplyPreviewProps) {
    if (!replyingTo) return null;

    return (
        <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: 'rgba(246, 133, 55, 0.3)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                <View style={{ width: 4, height: 40, backgroundColor: '#F68537', borderRadius: 9999, marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: '#F68537', fontWeight: 'bold', marginBottom: 2 }}>Replying to...</Text>
                    <Text style={{ fontSize: 12, color: '#4B5563' }} numberOfLines={1}>
                        {replyingTo.message || 'Media'}
                    </Text>
                </View>
            </View>
            <TouchableOpacity onPress={onCancel} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
        </View>
    );
}
