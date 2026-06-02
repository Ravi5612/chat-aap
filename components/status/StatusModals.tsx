import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import EmojiPickerModal from '@/components/chat/EmojiPickerModal';

interface StatusModalsProps {
    showEmojiPicker: boolean;
    setShowEmojiPicker: (v: boolean) => void;
    onEmojiSelect: (emoji: string) => void;
    
    showPrivacyModal: boolean;
    setShowPrivacyModal: (v: boolean) => void;
    privacy: 'all' | 'selected';
    setPrivacy: (p: 'all' | 'selected') => void;
    setShowFriendPicker: (v: boolean) => void;
    
    showFriendPicker: boolean;
    friends: any[];
    selectedViewerIds: string[];
    setSelectedViewerIds: (ids: string[]) => void;
    
    insetsTop: number;
    insetsBottom: number;
}

export default function StatusModals({
    showEmojiPicker, setShowEmojiPicker, onEmojiSelect,
    showPrivacyModal, setShowPrivacyModal, privacy, setPrivacy, setShowFriendPicker,
    showFriendPicker, friends, selectedViewerIds, setSelectedViewerIds,
    insetsTop, insetsBottom
}: StatusModalsProps) {
    return (
        <>
            {showEmojiPicker && (
                <View style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 280,
                    backgroundColor: 'white', zIndex: 99, borderTopWidth: 1, borderTopColor: '#E2E8F0'
                }}>
                    <EmojiPickerModal
                        visible={showEmojiPicker}
                        onClose={() => setShowEmojiPicker(false)}
                        onSelect={onEmojiSelect}
                        isInline={true}
                    />
                </View>
            )}

            {showPrivacyModal && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, justifyContent: 'flex-end' }]}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowPrivacyModal(false)} />
                    <View style={{ backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: insetsBottom + 20 }}>
                        <Text style={{ fontSize: 20, fontWeight: '900', color: '#1E293B', marginBottom: 8 }}>Status Privacy</Text>
                        <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>Who can see your status updates?</Text>

                        <TouchableOpacity
                            onPress={() => { setPrivacy('all'); setShowPrivacyModal(false); }}
                            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}
                        >
                            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="people" size={20} color="#3B82F6" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 16 }}>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1E293B' }}>All Friends</Text>
                                <Text style={{ fontSize: 12, color: '#94A3B8' }}>Share with all your contacts</Text>
                            </View>
                            {privacy === 'all' && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => { setPrivacy('selected'); setShowPrivacyModal(false); setShowFriendPicker(true); }}
                            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16 }}
                        >
                            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="person-add" size={20} color="#10B981" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 16 }}>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1E293B' }}>Only Share With...</Text>
                                <Text style={{ fontSize: 12, color: '#94A3B8' }}>Select specific friends</Text>
                            </View>
                            {privacy === 'selected' && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {showFriendPicker && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'white', zIndex: 200, paddingTop: insetsTop }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                        <TouchableOpacity onPress={() => setShowFriendPicker(false)}>
                            <Ionicons name="arrow-back" size={24} color="#1E293B" />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1E293B' }}>Select Friends</Text>
                        <TouchableOpacity onPress={() => setShowFriendPicker(false)}>
                            <Text style={{ color: '#F68537', fontWeight: 'bold' }}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ flex: 1 }}>
                        {friends.map((friend: any) => (
                            <TouchableOpacity
                                key={friend.id}
                                onPress={() => {
                                    if (selectedViewerIds.includes(friend.id)) {
                                        setSelectedViewerIds(selectedViewerIds.filter(id => id !== friend.id));
                                    } else {
                                        setSelectedViewerIds([...selectedViewerIds, friend.id]);
                                    }
                                }}
                                style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' }}
                            >
                                <Image source={friend.img || require('@/assets/images/default-avatar-male.jpg')} style={{ width: 44, height: 44, borderRadius: 22 }} />
                                <Text style={{ flex: 1, marginLeft: 16, fontSize: 16, fontWeight: '600' }}>{friend.name}</Text>
                                <Ionicons
                                    name={selectedViewerIds.includes(friend.id) ? "checkbox" : "square-outline"}
                                    size={24}
                                    color={selectedViewerIds.includes(friend.id) ? "#F68537" : "#CBD5E1"}
                                />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </>
    );
}
