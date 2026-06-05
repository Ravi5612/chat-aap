import { supabase } from '@/lib/supabase';
import { saveLocalConversation } from '@/lib/localDb';
import { useDbStore } from '../useDbStore';
import { StoreGet, StoreSet } from './friendsTypes';
import { AppStorage } from '@/lib/storage';

export const createFriendsVaultActions = (set: StoreSet, get: StoreGet) => ({
    setVaultOpen: (isOpen: boolean) => {
        set({ isVaultOpen: isOpen });
    },

    setVaultPasscode: async (passcode: string | null) => {
        set({ vaultPasscode: passcode });
        if (passcode) {
            await AppStorage.setItemAsync('ninja_vault_passcode', passcode);
        } else {
            await AppStorage.deleteItemAsync('ninja_vault_passcode');
        }
    },

    loadVaultPasscode: async () => {
        try {
            const passcode = await AppStorage.getItemAsync('ninja_vault_passcode');
            set({ vaultPasscode: passcode });
        } catch (e) {
            console.error('Failed to load vault passcode', e);
        }
    },

    toggleChatHiddenStatus: async (chatId: string, isGroup: boolean, isHidden: boolean) => {
        const { db } = useDbStore.getState();
        const previousItems = get().combinedItems;

        set({ 
            combinedItems: previousItems.map(item => item.id === chatId ? { ...item, isHidden: isHidden } : item)
        });

        if (db) {
            const item = previousItems.find(i => i.id === chatId);
            if (item) {
                await saveLocalConversation(db, { ...item, isHidden: isHidden });
            }
        }

        const currentUserId = (require('../useAuthStore').useAuthStore.getState()).user?.id;
        if (currentUserId) {
            if (isGroup) {
                await supabase.from('group_members').update({ is_hidden: isHidden }).match({ user_id: currentUserId, group_id: chatId });
            } else {
                await supabase.from('friendships').update({ is_hidden: isHidden }).match({ user_id: currentUserId, friend_id: chatId });
            }
        }
    }
});
