import { getLocalConversations, getLocalBlocks } from '@/lib/localDb';
import { fetchAndFormatFriendsData } from '@/services/friendsService';
import { useAuthStore } from '../useAuthStore';
import { useDbStore } from '../useDbStore';
import { StoreGet, StoreSet } from './friendsTypes';

export const createFriendsLoadActions = (set: StoreSet, get: StoreGet) => ({
    setOnlineUsers: (onlineUsers: Record<string, any>) => {
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

    loadFriends: async (userId: string, force = false) => {
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
                const filteredLocalConv = localConv.filter((c: any) => c.id !== userId);
                set({ 
                    combinedItems: filteredLocalConv,
                    lockedChatIds: filteredLocalConv.filter((c: any) => c.isLocked).map((c: any) => c.id),
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
    }
});
