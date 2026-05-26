import { supabase } from '@/lib/supabase';
import { StoreGet, StoreSet } from './friendsTypes';

export const createFriendsGroupActions = (set: StoreSet, get: StoreGet) => ({
    leaveGroup: async (userId: string, groupId: string) => {
        try {
            let activeUserId = userId || (await supabase.auth.getUser()).data.user?.id || '';
            if (!activeUserId) throw new Error('User not authenticated');

            const { data: profile } = await supabase.from('profiles').select('username').eq('id', activeUserId).single();
            await supabase.from('messages').insert([{ group_id: groupId, sender_id: activeUserId, message: `SYSTEM_MSG: ${profile?.username || 'A user'} has left the group`, status: 'sent', is_read: false }]);
            const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', activeUserId);
            if (error) throw error;

            await get().loadFriends(activeUserId);
            return true;
        } catch (e) {
            console.error("FriendsStore: Error leaving group", e);
            return false;
        }
    },

    fetchGroupMembers: async (groupId: string) => {
        try {
            const { data, error } = await supabase
                .from('group_members')
                .select('user_id, role, joined_at, profiles:profiles(id, username, avatar_url, is_online)')
                .eq('group_id', groupId);
            if (error) throw error;
            return (data || []).map((m: any) => ({
                id: m.user_id,
                name: m.profiles?.username || 'Unknown',
                img: m.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.profiles?.username || 'U')}&backgroundColor=F68537`,
                role: m.role || 'member',
                joined_at: m.joined_at,
                isOnline: m.profiles?.is_online === true
            }));
        } catch (e) {
            console.error('fetchGroupMembers error:', e);
            return [];
        }
    },

    addGroupMember: async (groupId: string, userId: string, addedBy: string) => {
        try {
            const { data: adminCheck } = await supabase.from('group_members').select('role').eq('group_id', groupId).eq('user_id', addedBy).single();
            if (!adminCheck || adminCheck.role !== 'admin') {
                require('react-native').Alert.alert('Permission Denied', 'Only admins can add members.');
                return false;
            }
            const { data: existing } = await supabase.from('group_members').select('id').eq('group_id', groupId).eq('user_id', userId).maybeSingle();
            if (existing) {
                require('react-native').Alert.alert('Already a Member', 'This user is already in the group.');
                return false;
            }
            const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: userId, role: 'member' });
            if (error) throw error;

            const { data: profile } = await supabase.from('profiles').select('username').eq('id', userId).single();
            await supabase.from('messages').insert([{ group_id: groupId, sender_id: addedBy, message: `SYSTEM_MSG: ${profile?.username || 'A user'} was added to the group`, status: 'sent', is_read: false }]);
            return true;
        } catch (e) {
            console.error('addGroupMember error:', e);
            require('react-native').Alert.alert('Error', 'Failed to add member.');
            return false;
        }
    },

    removeGroupMember: async (groupId: string, userId: string, removedBy: string) => {
        try {
            const { data: adminCheck } = await supabase.from('group_members').select('role').eq('group_id', groupId).eq('user_id', removedBy).single();
            if (!adminCheck || adminCheck.role !== 'admin') {
                require('react-native').Alert.alert('Permission Denied', 'Only admins can remove members.');
                return false;
            }
            const { data: targetRole } = await supabase.from('group_members').select('role').eq('group_id', groupId).eq('user_id', userId).single();
            if (targetRole?.role === 'admin' && userId !== removedBy) {
                require('react-native').Alert.alert('Permission Denied', 'Cannot remove another admin.');
                return false;
            }
            const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
            if (error) throw error;

            const { data: profile } = await supabase.from('profiles').select('username').eq('id', userId).single();
            await supabase.from('messages').insert([{ group_id: groupId, sender_id: removedBy, message: `SYSTEM_MSG: ${profile?.username || 'A user'} was removed from the group`, status: 'sent', is_read: false }]);
            return true;
        } catch (e) {
            console.error('removeGroupMember error:', e);
            require('react-native').Alert.alert('Error', 'Failed to remove member.');
            return false;
        }
    },

    makeGroupAdmin: async (groupId: string, userId: string, requestedBy: string) => {
        try {
            const { data: adminCheck } = await supabase.from('group_members').select('role').eq('group_id', groupId).eq('user_id', requestedBy).single();
            if (!adminCheck || adminCheck.role !== 'admin') {
                require('react-native').Alert.alert('Permission Denied', 'Only admins can promote members.');
                return false;
            }
            const { error } = await supabase.from('group_members').update({ role: 'admin' }).eq('group_id', groupId).eq('user_id', userId);
            if (error) throw error;

            const { data: profile } = await supabase.from('profiles').select('username').eq('id', userId).single();
            await supabase.from('messages').insert([{ group_id: groupId, sender_id: requestedBy, message: `SYSTEM_MSG: ${profile?.username || 'A user'} is now an admin`, status: 'sent', is_read: false }]);
            return true;
        } catch (e) {
            console.error('makeGroupAdmin error:', e);
            require('react-native').Alert.alert('Error', 'Failed to make admin.');
            return false;
        }
    }
});
