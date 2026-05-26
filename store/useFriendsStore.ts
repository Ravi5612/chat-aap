import { create } from 'zustand';
import { FriendsState } from './friends/friendsTypes';
import { createFriendsLoadActions } from './friends/friendsLoadActions';
import { createFriendsBlockActions } from './friends/friendsBlockActions';
import { createFriendsLockActions } from './friends/friendsLockActions';
import { createFriendsGroupActions } from './friends/friendsGroupActions';

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
    loading: false,
    error: null,

    // Extracted Actions (Slices)
    ...createFriendsLoadActions(set, get),
    ...createFriendsBlockActions(set, get),
    ...createFriendsLockActions(set, get),
    ...createFriendsGroupActions(set, get),

    // Simple State Reset Action
    reset: () => set({ friends: [], groups: [], combinedItems: [], myStatuses: { active: [] }, onlineUsers: {}, blockedUserIds: [], error: null })
}));
