import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/store/useChatStore';
import { useAuthStore } from '@/store/useAuthStore';

export const useChatRoom = (friendId: string, currentUserArg: any, isGroup: boolean = false) => {
    const { user: currentUser } = useAuthStore();
    const {
        messages,
        loading,
        isTyping,
        flyingEmoji,
        chatKey,
        initChat,
        loadMessages,
        sendMessage,
        reactToMessage,
        saveEdit,
        deleteMessage,
        forwardMessage,
        setTypingStatus,
        cleanupChat,
        setFlyingEmoji
    } = useChatStore();

    // Sync active channel setting
    useEffect(() => {
        if (!friendId || !currentUser) return;

        const logPrefix = `[Chat:${friendId.substring(0, 4)}]`;
        const channelName = isGroup ? `group-${friendId}` : `chat-${[currentUser.id, friendId].sort().join('-')}`;

        const channel = supabase.channel(channelName);

        // Configure internal channel state in store
        useChatStore.setState({ activeChannel: channel });

        initChat(friendId, currentUser, isGroup);

        channel
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
                const newMsg = payload.new;
                const isRelevant = isGroup
                    ? newMsg.group_id === friendId
                    : (newMsg.sender_id === friendId && newMsg.receiver_id === currentUser.id) ||
                    (newMsg.sender_id === currentUser.id && newMsg.receiver_id === friendId);

                if (isRelevant) {
                    // Only need to reload if not already there or decrypt new one
                    // For simplicity, calling loadMessages again or handling insert
                    loadMessages(friendId, currentUser, isGroup);
                }
            })
            .on('broadcast', { event: 'new_message' }, (payload) => {
                const msg = payload.payload;
                if (msg.sender_id === currentUser.id) return;
                useChatStore.setState((state) => ({
                    messages: state.messages.some(m => m.id === msg.id) ? state.messages : [...state.messages, msg]
                }));
            })
            .on('broadcast', { event: 'typing' }, (payload) => {
                const data = payload.payload || payload;
                if (data.user_id === friendId) {
                    useChatStore.setState({ isTyping: data.is_typing });
                }
            })
            .on('broadcast', { event: 'status_update' }, (payload) => {
                const update = payload.payload;
                useChatStore.setState((state) => ({
                    messages: state.messages.map(msg => {
                        if (msg.id === update.message_id || (msg.sender_id === currentUser.id && update.status === 'read')) {
                            return { ...msg, status: update.status };
                        }
                        return msg;
                    })
                }));
            })
            .on('broadcast', { event: 'message_reaction' }, (payload) => {
                const { message_id, emoji, reactions } = payload.payload;
                useChatStore.setState((state) => ({
                    messages: state.messages.map(m => m.id === message_id ? { ...m, reactions } : m)
                }));
                setFlyingEmoji({ emoji, messageId: message_id, id: Date.now() });
                setTimeout(() => setFlyingEmoji(null), 2000);
            })
            .on('broadcast', { event: 'message_edit' }, async (payload) => {
                const { message_id, message: encText } = payload.payload;
                if (chatKey) {
                    const { decryptText } = await import('@/utils/chatCrypto');
                    const decText = await decryptText(encText, chatKey);
                    useChatStore.setState((state) => ({
                        messages: state.messages.map(m => m.id === message_id ? { ...m, message: decText, is_edited: true } : m)
                    }));
                }
            })
            .on('broadcast', { event: 'message_delete' }, (payload) => {
                const { message_id } = payload.payload;
                useChatStore.setState((state) => ({
                    messages: state.messages.filter(m => m.id !== message_id)
                }));
            })
            .subscribe();

        loadMessages(friendId, currentUser, isGroup);

        return () => {
            supabase.removeChannel(channel);
            cleanupChat();
        };
    }, [friendId, currentUser?.id, isGroup]);

    const handleSendMessage = useCallback((text: string, replyToId?: string) => {
        if (currentUser) sendMessage(text, friendId, currentUser, isGroup, replyToId);
    }, [friendId, currentUser, isGroup, sendMessage]);

    const handleReact = useCallback((messageId: string, emoji: string) => {
        if (currentUser) reactToMessage(messageId, emoji, currentUser);
    }, [currentUser, reactToMessage]);

    const handleSaveEdit = useCallback((messageId: string, newText: string) => {
        if (currentUser) saveEdit(messageId, newText, currentUser);
    }, [currentUser, saveEdit]);

    const handleDeleteMessage = useCallback((messageId: string) => {
        deleteMessage(messageId);
    }, [deleteMessage]);

    const handleForwardMessage = useCallback((messageText: string, friendIds: string[]) => {
        if (currentUser) forwardMessage(messageText, friendIds, currentUser);
    }, [currentUser, forwardMessage]);

    const handleTypingStatus = useCallback((typing: boolean) => {
        if (currentUser) setTypingStatus(typing, friendId, currentUser);
    }, [currentUser, friendId, setTypingStatus]);

    return {
        messages,
        loading,
        isTyping,
        handleSendMessage,
        handleReact,
        flyingEmoji,
        handleSaveEdit,
        handleDeleteMessage,
        handleForwardMessage,
        handleTypingStatus,
        loadMore: () => currentUser && loadMessages(friendId, currentUser, isGroup)
    };
};
