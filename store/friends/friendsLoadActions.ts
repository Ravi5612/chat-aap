import { getLocalConversations, getLocalBlocks } from '@/lib/localDb';
import { fetchAndFormatFriendsData } from '@/services/friendsService';
import { useAuthStore } from '../useAuthStore';
import { useDbStore } from '../useDbStore';
import { StoreGet, StoreSet } from './friendsTypes';

let loadedForUserId: string | null = null;
let isFetchingUserId: string | null = null;

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
        
        // Concurrency Lock: Prevent multiple identical queries from exhausting the connection pool
        if (!force && isFetchingUserId === userId) {
            return;
        }
        
        isFetchingUserId = userId;
        
        const { combinedItems: existingItems, onlineUsers } = get();
        const { db } = useDbStore.getState();

        // SILENT LOCAL LOAD FIRST
        if (db && existingItems.length === 0) {
            const { getLocalStatuses } = require('@/lib/localDb');
            const [localConv, localBlocked, localStatuses] = await Promise.all([
                getLocalConversations(db),
                getLocalBlocks(db, userId),
                getLocalStatuses(db)
            ]);

            let localStatusInfo: Record<string, any> = {};
            if (localStatuses && localStatuses.length > 0) {
                localStatuses.forEach((s: any) => {
                    if (s.is_deleted === 1 || s.is_deleted === true || s.is_deleted === '1') return;
                    if (!localStatusInfo[s.user_id]) {
                        localStatusInfo[s.user_id] = { count: 0, viewedCount: 0 };
                    }
                    localStatusInfo[s.user_id].count++;
                });
                set({ statusInfo: localStatusInfo });
            }

            if (localConv && localConv.length > 0) {
                const filteredLocalConv = localConv.filter((c: any) => c.id !== userId);
                set({ 
                    combinedItems: filteredLocalConv,
                    friends: filteredLocalConv.filter((c: any) => !c.isGroup),
                    groups: filteredLocalConv.filter((c: any) => c.isGroup),
                    lockedChatIds: filteredLocalConv.filter((c: any) => c.isLocked).map((c: any) => c.id),
                    loading: false 
                });
            }
            if (localBlocked && localBlocked.length > 0) {
                set({ blockedUserIds: localBlocked });
            }
        }

        const currentItems = get().combinedItems;
        const isFirstLoad = loadedForUserId !== userId;
        // Only show loading skeleton if we have NO data from cache/local DB
        const shouldShowLoading = isFirstLoad && currentItems.length === 0;
        
        // Only set loading if it's the first time loading for this user AND we have no local data
        if (shouldShowLoading) {
            set({ loading: true, error: null });
        }

        try {
            const currentUserId = useAuthStore.getState().user?.id;
            const data = await fetchAndFormatFriendsData(userId, existingItems, db, onlineUsers, currentUserId);
            
            loadedForUserId = userId; // Mark as loaded for this user

            // SMART MERGE: Prevent UI flicker if Supabase temporarily returns empty but we have local data
            const finalCombinedItems = (data.combinedItems.length === 0 && currentItems.length > 0)
                ? currentItems
                : data.combinedItems;

            // SMART MERGE: Preserve any temporary 'uploading' statuses that haven't hit the DB yet
            const currentMyStatuses = get().myStatuses || { active: [] };
            const uploadingStatuses = currentMyStatuses.active?.filter((s: any) => s.isUploading) || [];
            
            const finalMyStatuses = {
                ...data.myStatuses,
                active: [...uploadingStatuses, ...(data.myStatuses?.active || [])]
            };

            set({
                friends: data.friends,
                groups: data.groups,
                myStatuses: finalMyStatuses,
                statusInfo: data.statusInfo,
                combinedItems: finalCombinedItems,
                lockedChatIds: data.lockedChatIds,
                blockedUserIds: data.blockedIds,
                loading: false
            });
        } catch (e: any) {
            console.error('loadFriends ERROR:', e);
            set({ error: e.message, loading: false });
        } finally {
            if (isFetchingUserId === userId) {
                isFetchingUserId = null;
            }
        }
    }
});
