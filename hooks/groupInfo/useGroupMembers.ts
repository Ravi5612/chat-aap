import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useFriendsStore } from '@/store/useFriendsStore';
import { useRouter } from 'expo-router';

export const useGroupMembers = (groupId: string, currentUser: any) => {
    const router = useRouter();
    const { fetchGroupMembers, addGroupMember, removeGroupMember, makeGroupAdmin, leaveGroup } = useFriendsStore();

    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [myRole, setMyRole] = useState<'admin' | 'member'>('member');

    const loadMembers = useCallback(async () => {
        if (!groupId) return;
        setLoading(true);
        const data = await fetchGroupMembers(groupId);
        setMembers(data);
        const me = data.find(m => m.id === currentUser?.id);
        setMyRole(me?.role === 'admin' ? 'admin' : 'member');
        setLoading(false);
    }, [groupId, currentUser?.id, fetchGroupMembers]);

    useEffect(() => {
        loadMembers();
    }, [loadMembers]);

    const handleAddMember = async (userId: string, onSuccess?: () => void) => {
        if (!currentUser?.id || !groupId) return;
        setActionLoading(true);
        const success = await addGroupMember(groupId, userId, currentUser.id);
        if (success) {
            await loadMembers();
            if (onSuccess) onSuccess();
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

    return {
        members,
        loading,
        actionLoading,
        myRole,
        handleAddMember,
        handleRemoveMember,
        handleMakeAdmin,
        handleLeaveGroup
    };
};
