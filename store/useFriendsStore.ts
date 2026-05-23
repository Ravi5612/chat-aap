import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useDbStore } from './useDbStore';
import { getLocalConversations, getLocalBlocks, saveLocalBlock, deleteLocalBlock, saveLocalConversation } from '@/lib/localDb';
import { useAuthStore } from './useAuthStore';
import { Alert } from 'react-native';
import { fetchAndFormatFriendsData } from '@/services/friendsService';

interface FriendsState {
    friends: any[];
    groups: any[];
    combinedItems: any[];
    myStatuses: any;
    statusInfo: Record<string, { count: number, viewedCount: number, thumbnail?: string, mediaType?: string }>;
    onlineUsers: Record<string, any>;
    globalChannel: any | null;
    blockedUserIds: string[];
    lockedChatIds: string[];
    loading: boolean;
    error: string | null;
    setOnlineUsers: (users: Record<string, any>) => void;
    loadFriends: (userId: string, force?: boolean) => Promise<void>;
    fetchBlockedUsers: (userId: string) => Promise<void>;
    blockUser: (currentUserId: string, targetId: string) => Promise<void>;
    unblockUser: (currentUserId: string, targetId: string) => Promise<void>;
    lockChat: (chatId: string) => Promise<void>;
    unlockChat: (chatId: string) => Promise<void>;
    isChatLocked: (chatId: string) => boolean;
    leaveGroup: (userId: string, groupId: string) => Promise<boolean>;
    fetchGroupMembers: (groupId: string) => Promise<any[]>;
    addGroupMember: (groupId: string, userId: string, addedBy: string) => Promise<boolean>;
    removeGroupMember: (groupId: string, userId: string, removedBy: string) => Promise<boolean>;
    makeGroupAdmin: (groupId: string, userId: string, requestedBy: string) => Promise<boolean>;
    reset: () => void;
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
    friends: [],
    groups: [],
    combinedItems: [],
    myStatuses: { active: [] },
    statusInfo: {},
    onlineUsers: {},
    globalChannel: null,
    blockedUserIds: [],
    lockedChatIds: [],
    loading: false,
    error: null,

    setOnlineUsers: (onlineUsers) => {
        set({ onlineUsers });
        const { combinedItems } = get();
        if (combinedItems.length === 0) return;

        const currentUserId = useAuthStore.getState().user?.id;
        const isConnected = currentUserId ? !!onlineUsers[currentUserId] : false;

        let anyChanged = false;
        const updated = combinedItems.map(item => {
            if (item.isGroup) return item;
            const isOnline = isConnected ? !!onlineUsers[item.id] : item.db_is_online === true;
            const isTyping = onlineUsers[item.id]?.typingTo === currentUserId;
            if (item.isOnline === isOnline && item.isTyping === isTyping) return item;
            anyChanged = true;
            return { ...item, isOnline, isTyping };
        });

        if (anyChanged) set({ combinedItems: updated });
    },

    loadFriends: async (userId, force = false) => {
        if (!userId || userId === 'null') return;
        
        const { combinedItems: existingItems, onlineUsers } = get();
        const { db } = useDbStore.getState();

        // SILENT LOCAL LOAD FIRST
        if (db && existingItems.length === 0) {
            const [localConv, localBlocked] = await Promise.all([
                getLocalConversations(db),
                getLocalBlocks(db, userId)
            ]);

            if (localConv && localConv.length > 0) {
                set({ 
                    combinedItems: localConv,
                    lockedChatIds: localConv.filter((c: any) => c.isLocked).map((c: any) => c.id),
                    loading: false 
                });
            }
            if (localBlocked && localBlocked.length > 0) {
                set({ blockedUserIds: localBlocked });
            }
        }

        const currentItems = get().combinedItems;
        const shouldShowLoading = (currentItems.length === 0 || force);
        set({ loading: shouldShowLoading, error: null });

        try {
            const currentUserId = useAuthStore.getState().user?.id;
            const data = await fetchAndFormatFriendsData(userId, existingItems, db, onlineUsers, currentUserId);
            
            set({
                friends: data.friends,
                groups: data.groups,
                myStatuses: data.myStatuses,
                statusInfo: data.statusInfo,
                combinedItems: data.combinedItems,
                lockedChatIds: data.lockedChatIds,
                blockedUserIds: data.blockedIds,
                loading: false
            });
        } catch (e: any) {
            console.error('loadFriends ERROR:', e);
            set({ error: e.message, loading: false });
        }
    },

    fetchBlockedUsers: async (userId) => {
        if (!userId) return;
        const { data, error } = await supabase.from('blocked_users').select('blocked_id').eq('blocker_id', userId);
        if (!error && data) set({ blockedUserIds: data.map(b => b.blocked_id) });
    },

    blockUser: async (currentUserId, targetId) => {
        const previousBlockedIds = get().blockedUserIds;
        const previousItems = get().combinedItems;
        
        set({ 
            blockedUserIds: [...previousBlockedIds, targetId],
            combinedItems: previousItems.map(item => item.id === targetId ? { ...item, isBlocked: true } : item)
        });
        
        const { db } = useDbStore.getState();
        if (db) await saveLocalBlock(db, currentUserId, targetId);

        try {
            const { error } = await supabase.from('blocked_users').insert({ blocker_id: currentUserId, blocked_id: targetId });
            if (error) {
                set({ blockedUserIds: previousBlockedIds, combinedItems: previousItems });
                if (db) await deleteLocalBlock(db, currentUserId, targetId);
                Alert.alert("Block Failed", `Server error: ${error.message}`);
            }
        } catch (e: any) {
            Alert.alert("Block Error", e.message || "Unknown error occurred");
        }
    },

    unblockUser: async (currentUserId, targetId) => {
        const previousBlockedIds = get().blockedUserIds;
        const previousItems = get().combinedItems;
        
        set({ 
            blockedUserIds: previousBlockedIds.filter(id => id !== targetId),
            combinedItems: previousItems.map(item => item.id === targetId ? { ...item, isBlocked: false } : item)
        });
        
        const { db } = useDbStore.getState();
        if (db) await deleteLocalBlock(db, currentUserId, targetId);

        try {
            const { error } = await supabase.from('blocked_users').delete().eq('blocker_id', currentUserId).eq('blocked_id', targetId);
            if (error) {
                set({ blockedUserIds: previousBlockedIds });
                if (db) await saveLocalBlock(db, currentUserId, targetId);
                Alert.alert("Unblock Failed", `Server error: ${error.message}`);
            }
        } catch (e: any) {
            Alert.alert("Unblock Error", e.message || "Unknown error occurred");
        }
    },

    leaveGroup: async (userId, groupId) => {
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

    lockChat: async (chatId) => {
        const { db } = useDbStore.getState();
        const previousItems = get().combinedItems;
        const previousLocked = get().lockedChatIds;

        set({ 
            lockedChatIds: [...previousLocked, chatId],
            combinedItems: previousItems.map(item => item.id === chatId ? { ...item, isLocked: true } : item)
        });

        if (db) {
            const item = previousItems.find(i => i.id === chatId);
            if (item) {
                await saveLocalConversation(db, { ...item, isLocked: true });
            }
        }

        const currentUserId = (require('./useAuthStore').useAuthStore.getState()).user?.id;
        if (currentUserId) {
            await supabase.from('friendships').update({ is_locked: true }).match({ user_id: currentUserId, friend_id: chatId });
        }
    },

    unlockChat: async (chatId) => {
        const { db } = useDbStore.getState();
        const previousItems = get().combinedItems;
        const previousLocked = get().lockedChatIds;

        set({ 
            lockedChatIds: previousLocked.filter(id => id !== chatId),
            combinedItems: previousItems.map(item => item.id === chatId ? { ...item, isLocked: false } : item)
        });

        if (db) {
            const item = previousItems.find(i => i.id === chatId);
            if (item) {
                await saveLocalConversation(db, { ...item, isLocked: false });
            }
        }

        const currentUserId = (require('./useAuthStore').useAuthStore.getState()).user?.id;
        if (currentUserId) {
            await supabase.from('friendships').update({ is_locked: false }).match({ user_id: currentUserId, friend_id: chatId });
        }
    },

    isChatLocked: (chatId) => {
        return get().lockedChatIds.includes(chatId);
    },

    fetchGroupMembers: async (groupId) => {
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

    addGroupMember: async (groupId, userId, addedBy) => {
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

    removeGroupMember: async (groupId, userId, removedBy) => {
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

    makeGroupAdmin: async (groupId, userId, requestedBy) => {
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
    },

    reset: () => set({ friends: [], groups: [], combinedItems: [], myStatuses: { active: [] }, onlineUsers: {}, blockedUserIds: [], error: null })
}));
