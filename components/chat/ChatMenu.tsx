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
    isGroup: boolean;
    onLeaveGroup: () => void;
}

export default function ChatMenu({ visible, onClose, onViewProfile, onClearChat, onBlockUser, isBlocked, isGroup, onLeaveGroup }: ChatMenuProps) {
    if (!visible) return null;

    const mainItems = [
        { label: 'View Profile', icon: 'person-outline', onPress: onViewProfile, color: '#F68537' },
        { label: 'Mute Notifications', icon: 'volume-mute-outline', onPress: () => { }, color: '#F68537' },
        { label: 'Clear Chat', icon: 'trash-outline', onPress: onClearChat, color: '#F68537' },
    ];

    const dangerItems = [];

    if (!isGroup) {
        dangerItems.push({ label: isBlocked ? 'Unblock User' : 'Block User', icon: 'ban-outline', onPress: onBlockUser, color: '#EF4444' });
    }

    if (isGroup) {
        dangerItems.push({ label: 'Leave Group', icon: 'log-out-outline', onPress: onLeaveGroup, color: '#EF4444' });
    }

    dangerItems.push({ label: 'Report User', icon: 'warning-outline', onPress: () => { }, color: '#EF4444' });

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' }}>
                    <TouchableWithoutFeedback>
                        <View
                            style={{
                                position: 'absolute',
                                top: 60,
                                right: 16,
                                backgroundColor: 'white',
                                borderRadius: 24,
                                width: 230,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 10 },
                                shadowOpacity: 0.15,
                                shadowRadius: 20,
                                elevation: 8,
                                borderWidth: 1.5,
                                borderColor: '#F68537',
                                overflow: 'hidden'
                            }}
                        >
                            <View style={{ paddingVertical: 8 }}>
                                {mainItems.map((item, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => {
                                            item.onPress();
                                            onClose();
                                        }}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingHorizontal: 20,
                                            paddingVertical: 14,
                                        }}
                                    >
                                        <View style={{ width: 32 }}>
                                            <Ionicons name={item.icon as any} size={22} color={item.color} />
                                        </View>
                                        <Text style={{
                                            marginLeft: 8,
                                            fontSize: 16,
                                            fontWeight: '600',
                                            color: '#374151'
                                        }}>
                                            {item.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}

                                <View style={{ height: 1, backgroundColor: '#F6853740', marginHorizontal: 16, marginVertical: 4 }} />

                                {dangerItems.map((item, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => {
                                            item.onPress();
                                            onClose();
                                        }}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingHorizontal: 20,
                                            paddingVertical: 14,
                                        }}
                                    >
                                        <View style={{ width: 32 }}>
                                            <Ionicons name={item.icon as any} size={22} color={item.color} />
                                        </View>
                                        <Text style={{
                                            marginLeft: 8,
                                            fontSize: 16,
                                            fontWeight: '600',
                                            color: item.color
                                        }}>
                                            {item.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
