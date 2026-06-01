import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFriends } from '@/hooks/useFriends';

interface FriendSelectorModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (selectedIds: string[]) => void;
    initialSelectedIds: string[];
    title?: string;
    subtitle?: string;
}

export default function FriendSelectorModal({ 
    visible, 
    onClose, 
    onSave, 
    initialSelectedIds = [],
    title = "Select Friends",
    subtitle
}: FriendSelectorModalProps) {
    const { friends } = useFriends();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds));

    // Reset selection when modal opens
    useEffect(() => {
        if (visible) {
            setSelectedIds(new Set(initialSelectedIds));
            setSearchQuery('');
        }
    }, [visible, initialSelectedIds]);

    const activeFriends = friends.filter(f => f.isFriend);
    
    const filteredFriends = activeFriends.filter(f => {
        const nameMatch = f.friendProfile?.username?.toLowerCase().includes(searchQuery.toLowerCase());
        const phoneMatch = f.friendProfile?.phone?.includes(searchQuery);
        return nameMatch || phoneMatch;
    });

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleSave = () => {
        onSave(Array.from(selectedIds));
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>{title}</Text>
                        {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
                    </View>
                    <TouchableOpacity onPress={handleSave} style={styles.headerBtn}>
                        <Text style={styles.saveText}>Save</Text>
                    </TouchableOpacity>
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#9CA3AF" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search friends..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#9CA3AF"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* List */}
                {activeFriends.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                        <Text style={styles.emptyText}>You don't have any friends yet.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredFriends}
                        keyExtractor={(item) => item.friendId}
                        contentContainerStyle={{ padding: 16 }}
                        renderItem={({ item }) => {
                            const isSelected = selectedIds.has(item.friendId);
                            const profile = item.friendProfile;
                            
                            return (
                                <TouchableOpacity 
                                    style={styles.friendRow}
                                    onPress={() => toggleSelection(item.friendId)}
                                    activeOpacity={0.7}
                                >
                                    <Image 
                                        source={profile?.avatar_url ? { uri: profile.avatar_url } : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile?.username || 'User')}&backgroundColor=F68537`}
                                        style={styles.avatar}
                                    />
                                    <View style={styles.friendInfo}>
                                        <Text style={styles.friendName}>{profile?.username || 'User'}</Text>
                                        {profile?.phone && (
                                            <Text style={styles.friendPhone}>{profile.phone}</Text>
                                        )}
                                    </View>
                                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                        {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={
                            <Text style={styles.noResultsText}>No friends found matching "{searchQuery}"</Text>
                        }
                    />
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFDFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        backgroundColor: 'white',
    },
    headerBtn: {
        padding: 8,
    },
    cancelText: {
        fontSize: 16,
        color: '#6B7280',
    },
    saveText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#F68537',
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
        height: 44,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#1F2937',
    },
    friendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    friendInfo: {
        flex: 1,
        marginLeft: 12,
    },
    friendName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    friendPhone: {
        fontSize: 13,
        color: '#9CA3AF',
        marginTop: 2,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#F68537',
        borderColor: '#F68537',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    noResultsText: {
        textAlign: 'center',
        color: '#9CA3AF',
        marginTop: 32,
        fontSize: 15,
    }
});
