import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

interface MentionPickerModalProps {
    visible: boolean;
    onClose: () => void;
    friends: any[];
    mentionedFriends: any[];
    setMentionedFriends: (friends: any[]) => void;
    insetsTop: number;
}

export default function MentionPickerModal({
    visible, onClose, friends, mentionedFriends, setMentionedFriends, insetsTop
}: MentionPickerModalProps) {
    const [localSelected, setLocalSelected] = useState<any[]>([...mentionedFriends]);

    const handleToggle = (friend: any) => {
        if (localSelected.find(f => f.id === friend.id)) {
            setLocalSelected(localSelected.filter(f => f.id !== friend.id));
        } else {
            setLocalSelected([...localSelected, friend]);
        }
    };

    const handleDone = () => {
        setMentionedFriends(localSelected);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'white', zIndex: 200, paddingTop: insetsTop }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="arrow-back" size={24} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#1E293B' }}>Mention Friends</Text>
                    <TouchableOpacity onPress={handleDone}>
                        <Text style={{ color: '#F68537', fontWeight: 'bold' }}>Done</Text>
                    </TouchableOpacity>
                </View>

                {friends.length === 0 ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                        <Ionicons name="people-outline" size={48} color="#CBD5E1" />
                        <Text style={{ marginTop: 12, color: '#94A3B8', fontSize: 16 }}>No friends found</Text>
                    </View>
                ) : (
                    <ScrollView style={{ flex: 1 }}>
                        {friends.map((friend: any) => {
                            const isSelected = !!localSelected.find(f => f.id === friend.id);
                            return (
                                <TouchableOpacity
                                    key={friend.id}
                                    onPress={() => handleToggle(friend)}
                                    style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' }}
                                >
                                    <Image source={friend.img || require('@/assets/images/default-avatar-male.jpg')} style={{ width: 44, height: 44, borderRadius: 22 }} />
                                    <Text style={{ flex: 1, marginLeft: 16, fontSize: 16, fontWeight: '600' }}>{friend.name}</Text>
                                    <Ionicons
                                        name={isSelected ? "checkbox" : "square-outline"}
                                        size={24}
                                        color={isSelected ? "#F68537" : "#CBD5E1"}
                                    />
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
}
