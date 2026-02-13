import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, TextInput, Image, ActivityIndicator, StyleSheet, Platform, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFriends } from '@/hooks/useFriends';
import * as Haptics from 'expo-haptics';

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
        Haptics.selectionAsync();
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSend = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onForward(selectedIds);
        setSelectedIds([]);
        onClose();
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Forward</Text>
            <TouchableOpacity
                onPress={handleSend}
                disabled={selectedIds.length === 0}
                style={styles.headerBtn}
            >
                <Text style={[
                    styles.sendText,
                    selectedIds.length === 0 && styles.sendTextDisabled
                ]}>
                    Send{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={styles.container}>
                {renderHeader()}

                {/* Message Preview Capsule */}
                <View style={styles.previewContainer}>
                    <View style={styles.previewCapsule}>
                        <Ionicons name="share-social" size={14} color="#94A3B8" style={{ marginRight: 6 }} />
                        <Text style={styles.previewText} numberOfLines={1}>
                            {messageText || "Media Message"}
                        </Text>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={18} color="#94A3B8" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search people..."
                            placeholderTextColor="#94A3B8"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color="#CBD5E1" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator style={{ marginTop: 40 }} color="#F68537" />
                ) : (
                    <FlatList
                        data={filteredFriends}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => {
                            const isSelected = selectedIds.includes(item.id);
                            return (
                                <TouchableOpacity
                                    onPress={() => toggleSelect(item.id)}
                                    activeOpacity={0.7}
                                    style={styles.friendItem}
                                >
                                    <View style={styles.avatarContainer}>
                                        <Image source={{ uri: item.img }} style={styles.avatar} />
                                        {isSelected && (
                                            <View style={styles.selectionOverlay}>
                                                <Ionicons name="checkmark-circle" size={24} color="#F68537" />
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.friendInfo}>
                                        <Text style={styles.friendName}>{item.name}</Text>
                                        <Text style={styles.friendSub}>{item.email || 'Recent chat'}</Text>
                                    </View>
                                    <View style={[
                                        styles.checkbox,
                                        isSelected && styles.checkboxActive
                                    ]}>
                                        {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="people-outline" size={48} color="#E2E8F0" />
                                <Text style={styles.emptyText}>No contacts found</Text>
                            </View>
                        }
                        contentContainerStyle={{ paddingBottom: 40 }}
                    />
                )}
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerBtn: {
        minWidth: 60,
    },
    cancelText: {
        fontSize: 16,
        color: '#64748B',
        fontWeight: '500',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 17,
        fontWeight: '700',
        color: '#1E293B',
    },
    sendText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F68537',
        textAlign: 'right',
    },
    sendTextDisabled: {
        color: '#CBD5E1',
    },
    previewContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F8FAFC',
    },
    previewCapsule: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    previewText: {
        fontSize: 14,
        color: '#64748B',
        flex: 1,
    },
    searchContainer: {
        padding: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#1E293B',
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    selectionOverlay: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: 'white',
        borderRadius: 12,
    },
    friendInfo: {
        flex: 1,
        marginLeft: 12,
    },
    friendName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
    },
    friendSub: {
        fontSize: 13,
        color: '#94A3B8',
        marginTop: 2,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxActive: {
        backgroundColor: '#F68537',
        borderColor: '#F68537',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 15,
        color: '#94A3B8',
        fontWeight: '500',
    }
});
