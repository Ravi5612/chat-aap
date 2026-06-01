import { create } from 'zustand';
import { FriendsState } from './friends/friendsTypes';
import { createFriendsLoadActions } from './friends/friendsLoadActions';
import { createFriendsBlockActions } from './friends/friendsBlockActions';
import { createFriendsLockActions } from './friends/friendsLockActions';
import { createFriendsGroupActions } from './friends/friendsGroupActions';
import { createFriendsVaultActions } from './friends/friendsVaultActions';

export const useFriendsStore = create<FriendsState>((set, get) => ({
    // Initial State
    friends: [],
    groups: [],
    combinedItems: [],
    myStatuses: { active: [] },
    statusInfo: {},
    onlineUsers: {},
    globalChannel: null,
    blockedUserIds: [],
    lockedChatIds: [],
    isVaultOpen: false,
    vaultPasscode: null,
    loading: false,
    error: null,

    // Extracted Actions (Slices)
    ...createFriendsLoadActions(set, get),
    ...createFriendsBlockActions(set, get),
    ...createFriendsLockActions(set, get),
    ...createFriendsGroupActions(set, get),
    ...createFriendsVaultActions(set, get),

    // Simple State Actions
    clearUnreadCount: (chatId: string) => set((state) => ({
        combinedItems: state.combinedItems.map((item) => 
            item.id === chatId ? { ...item, unreadCount: 0 } : item
        )
    })),
    reset: () => set({ friends: [], groups: [], combinedItems: [], myStatuses: { active: [] }, onlineUsers: {}, blockedUserIds: [], error: null })
}));
