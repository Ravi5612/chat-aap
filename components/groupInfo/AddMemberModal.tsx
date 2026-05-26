import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useGroupSearch } from '@/hooks/groupInfo/useGroupSearch';

interface AddMemberModalProps {
    visible: boolean;
    onClose: () => void;
    members: any[];
    onAddMember: (userId: string, onSuccess: () => void) => void;
    actionLoading: boolean;
}

export default function AddMemberModal({ visible, onClose, members, onAddMember, actionLoading }: AddMemberModalProps) {
    const {
        searchQuery,
        searchResults,
        searching,
        handleSearchFriends,
        clearSearch
    } = useGroupSearch(members);

    const handleClose = () => {
        clearSearch();
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={handleClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Add Member</Text>
                        <TouchableOpacity onPress={handleClose}>
                            <Ionicons name="close-circle" size={28} color="#D1D5DB" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchBox}>
                        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by username..."
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={handleSearchFriends}
                            autoFocus
                        />
                    </View>

                    {searching && <ActivityIndicator color="#F68537" style={{ marginTop: 12 }} />}

                    <FlatList
                        data={searchResults}
                        keyExtractor={item => item.id}
                        style={{ maxHeight: 320 }}
                        ListEmptyComponent={
                            searchQuery.length >= 2 && !searching ? (
                                <Text style={styles.emptyText}>No users found</Text>
                            ) : null
                        }
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.searchResultRow}
                                onPress={() => onAddMember(item.id, handleClose)}
                                disabled={actionLoading}
                            >
                                <Image
                                    source={{
                                        uri: item.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.username || 'U')}&backgroundColor=F68537`
                                    }}
                                    style={styles.searchAvatar}
                                    contentFit="cover"
                                />
                                <Text style={styles.searchName}>{item.username}</Text>
                                <View style={styles.addMemberBtn}>
                                    <Ionicons name="add-circle" size={28} color="#F68537" />
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalCard: {
        backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, paddingBottom: 40, maxHeight: '80%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
    searchBox: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB',
        borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: 1.5, borderColor: '#E5E7EB', gap: 8, marginBottom: 16,
    },
    searchInput: { flex: 1, fontSize: 15, color: '#1F2937', fontWeight: '600' },
    searchResultRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    searchAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, borderWidth: 1.5, borderColor: '#FDE8D0' },
    searchName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1F2937' },
    addMemberBtn: { padding: 4 },
    emptyText: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, paddingVertical: 20 },
});
