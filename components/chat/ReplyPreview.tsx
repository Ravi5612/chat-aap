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
        <View className="px-4 py-2 bg-gray-50 border-b border-[#F68537]/30 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
                <View className="w-1 h-10 bg-[#F68537] rounded-full mr-3" />
                <View className="flex-1">
                    <Text className="text-xs text-[#F68537] font-bold mb-0.5">Replying to...</Text>
                    <Text className="text-xs text-gray-600 truncate" numberOfLines={1}>
                        {replyingTo.message || 'Media'}
                    </Text>
                </View>
            </View>
            <TouchableOpacity onPress={onCancel} className="p-1">
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
        </View>
    );
}
