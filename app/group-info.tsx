import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, StyleSheet,
    Alert, ActivityIndicator, TextInput, Modal, ScrollView, StatusBar
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/useAuthStore';
import { useFriendsStore } from '@/store/useFriendsStore';
import { supabase } from '@/lib/supabase';

export default function GroupInfoScreen() {
    const params = useLocalSearchParams<{ groupId: string; groupName: string; groupImage?: string }>();
    const { groupId, groupName, groupImage } = params;
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user: currentUser } = useAuthStore();
    const { fetchGroupMembers, addGroupMember, removeGroupMember, makeGroupAdmin, leaveGroup } = useFriendsStore();

    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [myRole, setMyRole] = useState<'admin' | 'member'>('member');
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const loadMembers = useCallback(async () => {
        if (!groupId) return;
        setLoading(true);
        const data = await fetchGroupMembers(groupId);
        setMembers(data);
        const me = data.find(m => m.id === currentUser?.id);
        setMyRole(me?.role === 'admin' ? 'admin' : 'member');
        setLoading(false);
    }, [groupId, currentUser?.id]);

    useEffect(() => {
        loadMembers();
    }, [loadMembers]);

    const handleSearchFriends = async (query: string) => {
        setSearchQuery(query);
        if (query.trim().length < 2) { setSearchResults([]); return; }
        setSearching(true);
        try {
            const { data } = await supabase
                .from('profiles')
                .select('id, username, avatar_url')
                .ilike('username', `%${query}%`)
                .limit(15);
            // Filter out existing members
            const existingIds = new Set(members.map(m => m.id));
            setSearchResults((data || []).filter(u => !existingIds.has(u.id)));
        } catch (e) {
            console.error('Search error:', e);
        } finally {
            setSearching(false);
        }
    };

    const handleAddMember = async (userId: string) => {
        if (!currentUser?.id || !groupId) return;
        setActionLoading(true);
        const success = await addGroupMember(groupId, userId, currentUser.id);
        if (success) {
            setAddModalVisible(false);
            setSearchQuery('');
            setSearchResults([]);
            await loadMembers();
            Alert.alert('Success', 'Member added successfully!');
        }
        setActionLoading(false);
    };

    const handleRemoveMember = (member: any) => {
        Alert.alert(
            'Remove Member',
            `Remove ${member.name} from this group?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove', style: 'destructive',
                    onPress: async () => {
                        if (!currentUser?.id || !groupId) return;
                        setActionLoading(true);
                        const success = await removeGroupMember(groupId, member.id, currentUser.id);
                        if (success) await loadMembers();
                        setActionLoading(false);
                    }
                }
            ]
        );
    };

    const handleMakeAdmin = (member: any) => {
        Alert.alert(
            'Make Admin',
            `Make ${member.name} an admin of this group? They will be able to add/remove members.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Make Admin', style: 'default',
                    onPress: async () => {
                        if (!currentUser?.id || !groupId) return;
                        setActionLoading(true);
                        const success = await makeGroupAdmin(groupId, member.id, currentUser.id);
                        if (success) {
                            await loadMembers();
                            Alert.alert('Done', `${member.name} is now an admin.`);
                        }
                        setActionLoading(false);
                    }
                }
            ]
        );
    };

    const handleLeaveGroup = () => {
        Alert.alert(
            'Leave Group',
            'Are you sure you want to leave this group?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave', style: 'destructive',
                    onPress: async () => {
                        if (!currentUser?.id || !groupId) return;
                        const success = await leaveGroup(currentUser.id, groupId);
                        if (success) {
                            router.replace('/(tabs)');
                        }
                    }
                }
            ]
        );
    };

    const renderMember = ({ item }: { item: any }) => {
        const isMe = item.id === currentUser?.id;
        const isAdmin = item.role === 'admin';

        return (
            <View style={styles.memberRow}>
                <View style={styles.memberAvatarContainer}>
                    <Image
                        source={{ uri: item.img }}
                        style={styles.memberAvatar}
                        contentFit="cover"
                    />
                    {item.isOnline && <View style={styles.onlineDot} />}
                </View>
                <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                        {item.name} {isMe ? '(You)' : ''}
                    </Text>
                    <View style={styles.roleBadge}>
                        <Ionicons
                            name={isAdmin ? 'shield-checkmark' : 'person'}
                            size={12}
                            color={isAdmin ? '#F68537' : '#9CA3AF'}
                        />
                        <Text style={[styles.roleText, isAdmin && styles.adminText]}>
                            {isAdmin ? 'Admin' : 'Member'}
                        </Text>
                    </View>
                </View>

                {/* Admin Actions — only for admins, not on themselves */}
                {myRole === 'admin' && !isMe && (
                    <View style={styles.actionRow}>
                        {!isAdmin && (
                            <TouchableOpacity
                                onPress={() => handleMakeAdmin(item)}
                                style={[styles.actionBtn, styles.promoteBtn]}
                            >
                                <Ionicons name="shield-checkmark-outline" size={16} color="#F68537" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={() => handleRemoveMember(item)}
                            style={[styles.actionBtn, styles.removeBtn]}
                        >
                            <Ionicons name="person-remove-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFDF9" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color="#F68537" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Group Info</Text>
                {myRole === 'admin' && (
                    <TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.addBtn}>
                        <Ionicons name="person-add-outline" size={22} color="#F68537" />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Group Banner */}
                <View style={styles.groupBanner}>
                    <View style={styles.groupAvatarWrapper}>
                        <Image
                            source={{
                                uri: groupImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(groupName || 'G')}&backgroundColor=F68537`
                            }}
                            style={styles.groupAvatar}
                            contentFit="cover"
                        />
                    </View>
                    <Text style={styles.groupName}>{groupName}</Text>
                    <Text style={styles.memberCount}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>
                    {myRole === 'admin' && (
                        <View style={styles.adminBadge}>
                            <Ionicons name="shield-checkmark" size={14} color="#F68537" />
                            <Text style={styles.adminBadgeText}>You are an Admin</Text>
                        </View>
                    )}
                </View>

                {/* Members Section */}
                <View style={styles.sectionHeader}>
                    <Ionicons name="people-outline" size={18} color="#F68537" />
                    <Text style={styles.sectionTitle}>Members</Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#F68537" style={{ marginTop: 40 }} />
                ) : (
                    <View style={styles.membersList}>
                        {members.map(item => (
                            <View key={item.id}>
                                {renderMember({ item })}
                            </View>
                        ))}
                    </View>
                )}

                {/* Leave Group */}
                <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveGroup}>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    <Text style={styles.leaveBtnText}>Leave Group</Text>
                </TouchableOpacity>
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Add Member Modal */}
            <Modal
                visible={addModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setAddModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Member</Text>
                            <TouchableOpacity onPress={() => { setAddModalVisible(false); setSearchQuery(''); setSearchResults([]); }}>
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
                                    onPress={() => handleAddMember(item.id)}
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

            {actionLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#F68537" />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFDF9' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#FDE8D0',
        backgroundColor: '#FFFDF9',
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', letterSpacing: -0.5 },
    addBtn: {
        backgroundColor: '#FFF5E6', borderRadius: 20, width: 40, height: 40,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: '#F68537',
    },

    // Group Banner
    groupBanner: {
        alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20,
        backgroundColor: '#FFFDF9',
    },
    groupAvatarWrapper: {
        width: 100, height: 100, borderRadius: 50,
        borderWidth: 3, borderColor: '#F68537',
        overflow: 'hidden', marginBottom: 12,
        shadowColor: '#F68537', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    groupAvatar: { width: '100%', height: '100%' },
    groupName: { fontSize: 22, fontWeight: '800', color: '#1F2937', marginBottom: 4 },
    memberCount: { fontSize: 14, color: '#9CA3AF', fontWeight: '600', marginBottom: 8 },
    adminBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#FFF5E6', paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1.5, borderColor: '#F68537',
    },
    adminBadgeText: { fontSize: 13, fontWeight: '700', color: '#F68537' },

    // Section
    sectionHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 20, paddingVertical: 12,
        borderTopWidth: 1, borderTopColor: '#FDE8D0',
        backgroundColor: '#FFF9F0',
    },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },

    // Members
    membersList: { paddingHorizontal: 16 },
    memberRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    memberAvatarContainer: { position: 'relative', marginRight: 12 },
    memberAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: '#FDE8D0' },
    onlineDot: {
        position: 'absolute', bottom: 1, right: 1,
        width: 12, height: 12, borderRadius: 6,
        backgroundColor: '#10B981', borderWidth: 2, borderColor: 'white',
    },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 3 },
    roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    roleText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
    adminText: { color: '#F68537' },
    actionRow: { flexDirection: 'row', gap: 8 },
    actionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    promoteBtn: { backgroundColor: '#FFF5E6', borderWidth: 1.5, borderColor: '#F68537' },
    removeBtn: { backgroundColor: '#FEF2F2', borderWidth: 1.5, borderColor: '#EF4444' },

    // Leave
    leaveBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        marginHorizontal: 20, marginTop: 24, paddingVertical: 14, borderRadius: 16,
        backgroundColor: '#FEF2F2', borderWidth: 1.5, borderColor: '#EF4444',
    },
    leaveBtnText: { fontSize: 16, fontWeight: '700', color: '#EF4444' },

    // Modal
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

    // Loading
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)',
        alignItems: 'center', justifyContent: 'center',
    },
});
