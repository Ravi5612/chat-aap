import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, TextInput, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFriends } from '@/hooks/useFriends';

interface ForwardMessageModalProps {
    visible: boolean;
    onClose: () => void;
    onForward: (friendIds: string[]) => void;
    messageText: string;
}

export default function ForwardMessageModal({ visible, onClose, onForward, messageText }: ForwardMessageModalProps) {
    const { combinedItems, loading } = useFriends();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const filteredFriends = combinedItems.filter(f =>
        !f.isGroup && f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSend = () => {
        onForward(selectedIds);
        setSelectedIds([]);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View className="flex-1 bg-white">
                <View className="px-4 py-4 border-b border-gray-100 flex-row items-center justify-between">
                    <TouchableOpacity onPress={onClose}>
                        <Text className="text-gray-500 font-medium">Cancel</Text>
                    </TouchableOpacity>
                    <Text className="text-lg font-bold">Forward message</Text>
                    <TouchableOpacity onPress={handleSend} disabled={selectedIds.length === 0}>
                        <Text className={`font-bold ${selectedIds.length > 0 ? 'text-[#F68537]' : 'text-gray-300'}`}>Send</Text>
                    </TouchableOpacity>
                </View>

                {/* Message Preview */}
                <View className="p-4 bg-gray-50 border-b border-gray-100 italic">
                    <Text className="text-gray-500 text-xs mb-1">FORWARDING</Text>
                    <Text className="text-gray-800 text-sm" numberOfLines={2}>"{messageText}"</Text>
                </View>

                {/* Search */}
                <View className="p-4">
                    <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
                        <Ionicons name="search" size={18} color="#94A3B8" />
                        <TextInput
                            className="flex-1 ml-2 text-base"
                            placeholder="Search friends..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator className="mt-10" color="#F68537" />
                ) : (
                    <FlatList
                        data={filteredFriends}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => toggleSelect(item.id)}
                                className="flex-row items-center px-4 py-3 border-b border-gray-50"
                            >
                                <Image source={{ uri: item.img }} className="w-10 h-10 rounded-full bg-gray-200" />
                                <Text className="flex-1 ml-3 font-semibold text-gray-800">{item.name}</Text>
                                <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${selectedIds.includes(item.id) ? 'bg-[#F68537] border-[#F68537]' : 'border-gray-200'}`}>
                                    {selectedIds.includes(item.id) && <Ionicons name="checkmark" size={16} color="white" />}
                                </View>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View className="items-center justify-center p-10">
                                <Text className="text-gray-400">No friends found</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </Modal>
    );
}
