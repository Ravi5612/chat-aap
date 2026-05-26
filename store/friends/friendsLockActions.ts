import { supabase } from '@/lib/supabase';
import { saveLocalConversation } from '@/lib/localDb';
import { useDbStore } from '../useDbStore';
import { StoreGet, StoreSet } from './friendsTypes';

export const createFriendsLockActions = (set: StoreSet, get: StoreGet) => ({
    lockChat: async (chatId: string) => {
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

        const currentUserId = (require('../useAuthStore').useAuthStore.getState()).user?.id;
        if (currentUserId) {
            await supabase.from('friendships').update({ is_locked: true }).match({ user_id: currentUserId, friend_id: chatId });
        }
    },

    unlockChat: async (chatId: string) => {
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

        const currentUserId = (require('../useAuthStore').useAuthStore.getState()).user?.id;
        if (currentUserId) {
            await supabase.from('friendships').update({ is_locked: false }).match({ user_id: currentUserId, friend_id: chatId });
        }
    },

    isChatLocked: (chatId: string) => {
        return get().lockedChatIds.includes(chatId);
    }
});
