import React from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatMenuProps {
    visible: boolean;
    onClose: () => void;
    onViewProfile: () => void;
    onClearChat: () => void;
    onBlockUser: () => void;
    isBlocked: boolean;
}

export default function ChatMenu({ visible, onClose, onViewProfile, onClearChat, onBlockUser, isBlocked }: ChatMenuProps) {
    if (!visible) return null;

    const items = [
        { label: 'View Profile', icon: 'person-outline', onPress: onViewProfile },
        { label: 'Clear Chat', icon: 'trash-outline', onPress: onClearChat },
        { label: isBlocked ? 'Unblock User' : 'Block User', icon: 'ban-outline', onPress: onBlockUser, color: '#EF4444' },
    ];

    return (
        <Modal transparent visible={visible} animationType="fade">
            <TouchableWithoutFeedback onPress={onClose}>
                <View className="flex-1 bg-black/5">
                    <View
                        className="absolute top-12 right-4 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 w-48"
                        style={{ elevation: 5 }}
                    >
                        {items.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => {
                                    item.onPress();
                                    onClose();
                                }}
                                className={`flex-row items-center px-4 py-3 active:bg-gray-50 ${index < items.length - 1 ? 'border-b border-gray-50' : ''}`}
                            >
                                <Ionicons name={item.icon as any} size={20} color={item.color || '#4B5563'} />
                                <Text className="ml-3 font-medium" style={{ color: item.color || '#4B5563' }}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
