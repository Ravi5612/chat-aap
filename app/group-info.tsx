import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/useAuthStore';

// Hooks
import { useGroupMembers } from '@/hooks/groupInfo/useGroupMembers';

// Components
import GroupBanner from '@/components/groupInfo/GroupBanner';
import MemberListItem from '@/components/groupInfo/MemberListItem';
import AddMemberModal from '@/components/groupInfo/AddMemberModal';

export default function GroupInfoScreen() {
    const params = useLocalSearchParams<{ groupId: string; groupName: string; groupImage?: string }>();
    const { groupId, groupName, groupImage } = params;
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const currentUser = useAuthStore(state => state.user);

    const [addModalVisible, setAddModalVisible] = useState(false);

    const {
        members,
        loading,
        actionLoading,
        myRole,
        handleAddMember,
        handleRemoveMember,
        handleMakeAdmin,
        handleLeaveGroup
    } = useGroupMembers(groupId, currentUser);

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
                <GroupBanner 
                    groupName={groupName}
                    groupImage={groupImage}
                    memberCount={members.length}
                    myRole={myRole}
                />

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
                            <MemberListItem 
                                key={item.id}
                                member={item}
                                currentUser={currentUser}
                                myRole={myRole}
                                onMakeAdmin={handleMakeAdmin}
                                onRemoveMember={handleRemoveMember}
                            />
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

            <AddMemberModal 
                visible={addModalVisible}
                onClose={() => setAddModalVisible(false)}
                members={members}
                onAddMember={handleAddMember}
                actionLoading={actionLoading}
            />

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

    // Leave
    leaveBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        marginHorizontal: 20, marginTop: 24, paddingVertical: 14, borderRadius: 16,
        backgroundColor: '#FEF2F2', borderWidth: 1.5, borderColor: '#EF4444',
    },
    leaveBtnText: { fontSize: 16, fontWeight: '700', color: '#EF4444' },

    // Loading
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)',
        alignItems: 'center', justifyContent: 'center',
    },
});

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
