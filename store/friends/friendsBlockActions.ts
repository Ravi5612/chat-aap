import { supabase } from '@/lib/supabase';
import { saveLocalBlock, deleteLocalBlock } from '@/lib/localDb';
import { Alert } from 'react-native';
import { useDbStore } from '../useDbStore';
import { StoreGet, StoreSet } from './friendsTypes';

export const createFriendsBlockActions = (set: StoreSet, get: StoreGet) => ({
    fetchBlockedUsers: async (userId: string) => {
        if (!userId) return;
        const { data, error } = await supabase.from('blocked_users').select('blocked_id').eq('blocker_id', userId);
        if (!error && data) set({ blockedUserIds: data.map(b => b.blocked_id) });
    },

    blockUser: async (currentUserId: string, targetId: string) => {
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

    unblockUser: async (currentUserId: string, targetId: string) => {
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
    }
});
