import { create } from 'zustand';
import { createChatLoadActions } from './chat/chatLoadActions';
import { createChatSendActions } from './chat/chatSendActions';
import { createChatUpdateActions } from './chat/chatUpdateActions';

interface ChatState {
    messages: any[];
    loading: boolean;
    loadingMore: boolean;  // ✅ Pagination loader
    hasMore: boolean;      // ✅ Kya aur messages hain?
    pageOffset: number;    // ✅ Current page offset
    isTyping: boolean;
    flyingEmoji: any;
    chatKey: Uint8Array | null;
    activeChannel: any | null;
    activeChatId: string | null;
    cache: Record<string, { messages: any[], key: Uint8Array }>;
    uploadProgress: Record<string, number>; // ✅ tempId -> 0-100 percent

    // Actions
    initChat: (friendId: string, currentUser: any, isGroup: boolean) => Promise<void>;
    loadMessages: (friendId: string, currentUser: any, isGroup: boolean) => Promise<void>;
    loadMoreMessages: (friendId: string, currentUser: any, isGroup: boolean) => Promise<void>;
    sendMessage: (text: string, friendId: string, currentUser: any, isGroup: boolean, replyToId?: string, messageType?: string, disappearingDuration?: number, scheduledAt?: Date) => Promise<void>;
    reactToMessage: (messageId: string, emoji: string, currentUser: any) => Promise<void>;
    saveEdit: (messageId: string, newText: string, currentUser: any) => Promise<void>;
    deleteMessage: (messageId: string, forEveryone: boolean) => Promise<void>;
    forwardMessage: (messageText: string, friendIds: string[], currentUser: any) => Promise<void>;
    setTypingStatus: (typing: boolean, friendId: string, currentUser: any) => void;
    cleanupChat: () => void;
    setFlyingEmoji: (emoji: any) => void;
    markAsRead: (messageId: string, currentUser: any, friendId: string, isGroup: boolean) => Promise<void>;
    loadMessagesUpToId: (friendId: string, currentUser: any, isGroup: boolean, targetMsgId: string, targetCreatedAt: string) => Promise<boolean>;
    reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => {
    const loadActions = createChatLoadActions(set as any, get as any);
    const sendActions = createChatSendActions(set as any, get as any);
    const updateActions = createChatUpdateActions(set as any, get as any);

    return {
        messages: [],
        loading: false,
        loadingMore: false,
        hasMore: true,
        pageOffset: 0,
        isTyping: false,
        flyingEmoji: null,
        chatKey: null,
        activeChannel: null,
        activeChatId: null,
        cache: {},
        uploadProgress: {}, // ✅ empty map initially

        setFlyingEmoji: (flyingEmoji) => set({ flyingEmoji }),

        initChat: loadActions.initChat,
        loadMessages: loadActions.loadMessages,
        loadMoreMessages: loadActions.loadMoreMessages,
        loadMessagesUpToId: loadActions.loadMessagesUpToId,

        sendMessage: sendActions.sendMessage,
        forwardMessage: sendActions.forwardMessage,

        reactToMessage: updateActions.reactToMessage,
        saveEdit: updateActions.saveEdit,
        deleteMessage: updateActions.deleteMessage,
        setTypingStatus: updateActions.setTypingStatus,
        markAsRead: updateActions.markAsRead,
        cleanupChat: updateActions.cleanupChat,

        reset: () => {
            set({
                messages: [],
                cache: {},
                activeChannel: null,
                activeChatId: null,
                chatKey: null,
                isTyping: false,
                uploadProgress: {}
            });
        }
    };
});
