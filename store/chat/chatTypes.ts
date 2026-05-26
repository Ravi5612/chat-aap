export interface ChatState {
    messages: any[];
    loading: boolean;
    loadingMore: boolean;
    hasMore: boolean;
    pageOffset: number;
    isTyping: boolean;
    flyingEmoji: any;
    chatKey: Uint8Array | null;
    activeChannel: any | null;
    activeChatId: string | null;
    cache: Record<string, { messages: any[], key: Uint8Array }>;
    uploadProgress: Record<string, number>;

    // Actions
    initChat: (friendId: string, currentUser: any, isGroup: boolean) => Promise<void>;
    loadMessages: (friendId: string, currentUser: any, isGroup: boolean) => Promise<void>;
    loadMoreMessages: (friendId: string, currentUser: any, isGroup: boolean) => Promise<void>;
    sendMessage: (text: string, friendId: string, currentUser: any, isGroup: boolean, replyToId?: string, messageType?: string) => Promise<void>;
    reactToMessage: (messageId: string, emoji: string, currentUser: any) => Promise<void>;
    saveEdit: (messageId: string, newText: string, currentUser: any) => Promise<void>;
    deleteMessage: (messageId: string, forEveryone: boolean) => Promise<void>;
    forwardMessage: (messageText: string, friendIds: string[], currentUser: any) => Promise<void>;
    setTypingStatus: (typing: boolean, friendId: string, currentUser: any) => void;
    cleanupChat: () => void;
    setFlyingEmoji: (emoji: any) => void;
    markAsRead: (messageId: string, currentUser: any, friendId: string, isGroup: boolean) => Promise<void>;
    loadMessagesUpToId: (friendId: string, currentUser: any, isGroup: boolean, targetMsgId: string, targetCreatedAt: string) => Promise<boolean>;
}

export type StoreSet = any;
export type StoreGet = () => ChatState;
