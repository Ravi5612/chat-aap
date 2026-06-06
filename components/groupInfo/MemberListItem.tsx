import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface MemberListItemProps {
    member: any;
    currentUser: any;
    myRole: 'admin' | 'member';
    onMakeAdmin: (member: any) => void;
    onRemoveMember: (member: any) => void;
}

export default React.memo(function MemberListItem({
    member,
    currentUser,
    myRole,
    onMakeAdmin,
    onRemoveMember
}: MemberListItemProps) {
    const isMe = member.id === currentUser?.id;
    const isAdmin = member.role === 'admin';

    const handleMakeAdmin = React.useCallback(() => {
        onMakeAdmin(member);
    }, [member, onMakeAdmin]);

    const handleRemoveMember = React.useCallback(() => {
        onRemoveMember(member);
    }, [member, onRemoveMember]);

    return (
        <View style={styles.memberRow}>
            <View style={styles.memberAvatarContainer}>
                <Image
                    source={{ uri: member.img }}
                    style={styles.memberAvatar}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                />
                {member.isOnline && <View style={styles.onlineDot} />}
            </View>
            <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                    {member.name} {isMe ? '(You)' : ''}
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

            {myRole === 'admin' && !isMe && (
                <View style={styles.actionRow}>
                    {!isAdmin && (
                        <TouchableOpacity
                            onPress={handleMakeAdmin}
                            style={[styles.actionBtn, styles.promoteBtn]}
                        >
                            <Ionicons name="shield-checkmark-outline" size={16} color="#F68537" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={handleRemoveMember}
                        style={[styles.actionBtn, styles.removeBtn]}
                    >
                        <Ionicons name="person-remove-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    memberRow: {
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingVertical: 12,
        borderBottomWidth: 1, 
        borderBottomColor: '#F3F4F6',
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
});
