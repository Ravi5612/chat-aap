import { useCallback } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatMembership } from './chatRoom/useChatMembership';
import { useChatRealtime } from './chatRoom/useChatRealtime';

export const useChatRoom = (friendId: string, currentUserArg: any, isGroup: boolean = false) => {
    const currentUser = useAuthStore(state => state.user);
    const messages = useChatStore(state => state.messages);
    const loading = useChatStore(state => state.loading);
    const loadingMore = useChatStore(state => state.loadingMore);
    const hasMore = useChatStore(state => state.hasMore);
    const isTyping = useChatStore(state => state.isTyping);
    const flyingEmoji = useChatStore(state => state.flyingEmoji);
    const loadMessages = useChatStore(state => state.loadMessages);
    const loadMoreMessages = useChatStore(state => state.loadMoreMessages);
    const sendMessage = useChatStore(state => state.sendMessage);
    const reactToMessage = useChatStore(state => state.reactToMessage);
    const saveEdit = useChatStore(state => state.saveEdit);
    const deleteMessage = useChatStore(state => state.deleteMessage);
    const forwardMessage = useChatStore(state => state.forwardMessage);
    const setTypingStatus = useChatStore(state => state.setTypingStatus);

    // 1. Membership Logic
    const isMember = useChatMembership(friendId, currentUser, isGroup);

    // 2. Realtime Channel Subscription Logic
    useChatRealtime(friendId, currentUser, isGroup);

    // 3. Handlers
    const handleSendMessage = useCallback((text: string, replyToId?: string, disappearingDuration?: number, messageType?: string, scheduledAt?: Date) => {
        if (isGroup && !isMember) {
            require('react-native').Alert.alert('Access Denied', 'You are no longer a participant of this group.');
            return;
        }
        if (currentUser) sendMessage(text, friendId, currentUser, isGroup, replyToId, messageType, disappearingDuration, scheduledAt);
    }, [friendId, currentUser, isGroup, isMember, sendMessage]);

    const handleReact = useCallback((messageId: string, emoji: string) => {
        if (currentUser) reactToMessage(messageId, emoji, currentUser);
    }, [currentUser, reactToMessage]);

    const handleSaveEdit = useCallback((messageId: string, newText: string) => {
        if (currentUser) saveEdit(messageId, newText, currentUser);
    }, [currentUser, saveEdit]);

    const handleDeleteMessage = useCallback((messageId: string, forEveryone: boolean) => {
        deleteMessage(messageId, forEveryone);
    }, [deleteMessage]);

    const handleForwardMessage = useCallback((messageText: string, friendIds: string[]) => {
        if (currentUser) forwardMessage(messageText, friendIds, currentUser);
    }, [currentUser, forwardMessage]);

    const handleTypingStatus = useCallback((typing: boolean) => {
        if (currentUser) setTypingStatus(typing, friendId, currentUser);
    }, [currentUser, friendId, setTypingStatus]);

    const handleLoadMore = useCallback(() => {
        if (currentUser && hasMore && !loadingMore) {
            loadMoreMessages(friendId, currentUser, isGroup);
        }
    }, [currentUser, friendId, isGroup, hasMore, loadingMore, loadMoreMessages]);

    return {
        messages,
        loading,
        loadingMore,
        hasMore,
        isTyping,
        isMember,
        handleSendMessage,
        handleReact,
        flyingEmoji,
        handleSaveEdit,
        handleDeleteMessage,
        handleForwardMessage,
        handleTypingStatus,
        handleLoadMore,
        loadMore: () => currentUser && loadMessages(friendId, currentUser, isGroup)
    };
};
