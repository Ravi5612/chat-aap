import { create } from 'zustand';
import { ChatState } from './chat/chatTypes';
import { createChatLoadActions } from './chat/chatLoadActions';
import { createChatSendActions } from './chat/chatSendActions';
import { createChatUpdateActions } from './chat/chatUpdateActions';

export const useChatStore = create<ChatState>((set, get) => ({
    // Initial State
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
    uploadProgress: {},

    // Simple State Setters
    setFlyingEmoji: (flyingEmoji) => set({ flyingEmoji }),

    // Extracted Actions (Slices)
    ...createChatLoadActions(set, get),
    ...createChatSendActions(set, get),
    ...createChatUpdateActions(set, get)
}));
