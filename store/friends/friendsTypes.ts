export interface FriendsState {
    friends: any[];
    groups: any[];
    combinedItems: any[];
    myStatuses: any;
    statusInfo: Record<string, { count: number, viewedCount: number, thumbnail?: string, mediaType?: string }>;
    onlineUsers: Record<string, any>;
    globalChannel: any | null;
    blockedUserIds: string[];
    lockedChatIds: string[];
    isVaultOpen: boolean;
    vaultPasscode: string | null;
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
    clearUnreadCount: (chatId: string) => void;
    setVaultOpen: (isOpen: boolean) => void;
    setVaultPasscode: (passcode: string | null) => void;
    loadVaultPasscode: () => Promise<void>;
    toggleChatHiddenStatus: (chatId: string, isGroup: boolean, isHidden: boolean) => Promise<void>;
    reset: () => void;
}

export type StoreSet = any;
export type StoreGet = () => FriendsState;
