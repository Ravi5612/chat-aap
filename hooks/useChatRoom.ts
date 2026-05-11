import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/store/useChatStore';
import { useAuthStore } from '@/store/useAuthStore';
import { decryptText } from '@/utils/chatCrypto';
import { useDbStore } from '@/store/useDbStore';
import { saveLocalMessage } from '@/lib/localDb';

export const useChatRoom = (friendId: string, currentUserArg: any, isGroup: boolean = false) => {
    const { user: currentUser } = useAuthStore();
    const {
        messages,
        loading,
        loadingMore,
        hasMore,
        isTyping,
        flyingEmoji,
        chatKey,
        initChat,
        loadMessages,
        loadMoreMessages,
        sendMessage,
        reactToMessage,
        saveEdit,
        deleteMessage,
        forwardMessage,
        setTypingStatus,
        cleanupChat,
        setFlyingEmoji
    } = useChatStore();

    const [isMember, setIsMember] = useState(true);

    // 1. Derive Chat Key First
    // 1. Derive Chat Key & Check Membership
    useEffect(() => {
        if (!friendId || !currentUser) {
            console.log('[DEBUG] ChatRoom: Missing ID or User, skipping init.');
            return;
        }

        console.log('[DEBUG] ChatRoom: Initializing for friend:', friendId);
        initChat(friendId, currentUser, isGroup);

        const checkMembership = async () => {
            if (!isGroup) {
                setIsMember(true);
                return;
            }
            const { data } = await supabase
                .from('group_members')
                .select('id')
                .eq('group_id', friendId)
                .eq('user_id', currentUser.id)
                .maybeSingle();

            setIsMember(!!data);
        };

        checkMembership();

        // Unique membership channel name
        const mChannelName = `membership-${friendId}-${currentUser.id}`;
        console.log('[DEBUG] ChatRoom: Subscribing to membership:', mChannelName);
        const membershipChannel = supabase.channel(mChannelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'group_members',
                    filter: `group_id=eq.${friendId}`
                },
                () => {
                    console.log('[DEBUG] ChatRoom: Membership change detected');
                    checkMembership();
                }
            )
            .subscribe((status) => {
                console.log('[DEBUG] ChatRoom: Membership Channel Status:', status);
            });

        return () => {
            console.log('[DEBUG] ChatRoom: Cleaning up membership channel');
            supabase.removeChannel(membershipChannel);
        };
    }, [friendId, currentUser?.id, isGroup]);

    // 2. Setup Channel and Load Messages Once Key is Ready
    useEffect(() => {
        if (!friendId || !currentUser || !chatKey) return;

        // UNIQUE Channel Name to avoid collisions
        const channelName = isGroup 
            ? `group-chat-${friendId}-${currentUser.id}` 
            : `p2p-chat-${[currentUser.id, friendId].sort().join('-')}`;
        
        console.log('[DEBUG] ChatRoom: Subscribing to messages on channel:', channelName);
        const channel = supabase.channel(channelName);

        // Configure internal channel state in store
        useChatStore.setState({ activeChannel: channel });

        channel
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
                const newMsg = payload.new;
                const isRelevant = isGroup
                    ? newMsg.group_id === friendId
                    : (newMsg.sender_id === friendId && newMsg.receiver_id === currentUser.id);

                if (isRelevant) {
                    // Small delay to ensure DB and Local State are in sync
                    await new Promise(resolve => setTimeout(resolve, 150));
                    
                    const currentKey = useChatStore.getState().chatKey;
                    if (!currentKey) {
                        console.warn('[DEBUG] ChatRoom: No key for realtime message, reloading...');
                        loadMessages(friendId, currentUser, isGroup);
                        return;
                    }

                    try {
                        let decryptedText = newMsg.message;
                        if (newMsg.message && typeof newMsg.message === 'string' && newMsg.message.trim().startsWith('{')) {
                            decryptedText = await decryptText(newMsg.message, currentKey);
                        }

                        let decryptedFileUrl = newMsg.file_url;
                        if (newMsg.file_url && newMsg.file_url.trim().startsWith('{')) {
                            decryptedFileUrl = await decryptText(newMsg.file_url, currentKey);
                        }

                        const finalMsg = { 
                            ...newMsg, 
                            message: decryptedText,
                            file_url: decryptedFileUrl,
                            sender: { id: newMsg.sender_id } 
                        };

                        useChatStore.setState((state) => {
                            if (state.messages.some(m => m.id === finalMsg.id)) return state;
                            return { messages: [...state.messages, finalMsg] };
                        });

                        // Save to Local DB
                        const { db } = useDbStore.getState();
                        if (db) saveLocalMessage(db, finalMsg);
                    } catch (e) {
                        console.error("ChatRoom: Realtime decryption failed", e);
                        // Silently reload messages to fix the UI
                        loadMessages(friendId, currentUser, isGroup);
                    }
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, async (payload) => {
                const updatedMsg = payload.new;
                const isRelevant = isGroup
                    ? updatedMsg.group_id === friendId
                    : (updatedMsg.sender_id === currentUser.id && updatedMsg.receiver_id === friendId) ||
                    (updatedMsg.sender_id === friendId && updatedMsg.receiver_id === currentUser.id);

                if (isRelevant) {
                    const statusOrder = { 'sent': 1, 'delivered': 2, 'read': 3 };
                    const newStatus = updatedMsg.is_read ? 'read' : updatedMsg.status;

                    useChatStore.setState((state) => ({
                        messages: state.messages.map(msg => {
                            if (msg.id === updatedMsg.id) {
                                const currentStatus = msg.status || 'sent';
                                if (statusOrder[newStatus as keyof typeof statusOrder] > statusOrder[currentStatus as keyof typeof statusOrder]) {
                                    // ONLY update status fields, NEVER overwrite the message text
                                    return { 
                                        ...msg, 
                                        status: newStatus, 
                                        is_read: updatedMsg.is_read,
                                        delivered_at: updatedMsg.delivered_at,
                                        read_at: updatedMsg.read_at
                                    };
                                }
                            }
                            return msg;
                        })
                    }));
                }
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
                const deletedMsg = payload.old;
                useChatStore.setState((state) => ({
                    messages: state.messages.filter(m => m.id !== deletedMsg.id)
                }));
            })
            .on('broadcast', { event: 'new_message' }, async (payload) => {
                const msg = payload.payload;
                if (!msg || msg.sender_id === currentUser.id) return;

                // Derive relevance
                const isRelevant = isGroup 
                    ? msg.group_id === friendId 
                    : (msg.sender_id === friendId && msg.receiver_id === currentUser.id);
                
                if (!isRelevant) return;

                try {
                    const currentKey = useChatStore.getState().chatKey;
                    if (!currentKey) return;

                    let finalMsg = { ...msg };

                    // 1. Decrypt Message Text
                    if (msg.message && typeof msg.message === 'string' && msg.message.trim().startsWith('{')) {
                        try {
                            finalMsg.message = await decryptText(msg.message, currentKey);
                        } catch (err) {
                            console.warn("Text decryption failed", err);
                        }
                    }

                    // 2. Decrypt File URL
                    if (msg.file_url && typeof msg.file_url === 'string' && msg.file_url.trim().startsWith('{')) {
                        try {
                            finalMsg.file_url = await decryptText(msg.file_url, currentKey);
                        } catch (err) {
                            console.warn("File URL decryption failed", err);
                        }
                    }

                    useChatStore.setState((state) => {
                        // Strict deduplication
                        if (state.messages.some(m => m.id === finalMsg.id)) return state;
                        return { messages: [...state.messages, finalMsg] };
                    });

                    // Save to Local DB
                    const { db } = useDbStore.getState();
                    if (db) saveLocalMessage(db, finalMsg);

                    // Mark as read
                    useChatStore.getState().markAsRead(finalMsg.id, currentUser, friendId, isGroup);
                } catch (e) {
                    console.error("Broadcast listener error:", e);
                }
            })
            .on('broadcast', { event: 'typing' }, (payload) => {
                const data = payload.payload || payload;
                if (data.user_id === friendId) {
                    useChatStore.setState({ isTyping: data.is_typing });
                }
            })
            .on('broadcast', { event: 'status_update' }, (payload) => {
                const update = payload.payload;
                const statusOrder = { 'sent': 1, 'delivered': 2, 'read': 3 };
                const newStatus = update.status;

                useChatStore.setState((state) => ({
                    messages: state.messages.map(msg => {
                        const isMyMessage = msg.sender_id === currentUser.id;
                        if (!isMyMessage) return msg;

                        const isMatch = isGroup
                            ? msg.group_id === update.group_id
                            : (msg.receiver_id === update.sender_id);

                        if (isMatch) {
                            if (update.message_id && msg.id !== update.message_id) return msg;

                            const currentStatus = msg.status || 'sent';
                            if (statusOrder[newStatus as keyof typeof statusOrder] > statusOrder[currentStatus as keyof typeof statusOrder]) {
                                return { ...msg, status: newStatus, is_read: newStatus === 'read' };
                            }
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
            .subscribe((status) => {
                console.log('[DEBUG] ChatRoom: Message Channel Status:', status);
            });

        loadMessages(friendId, currentUser, isGroup);

        return () => {
            console.log('[DEBUG] ChatRoom: Cleaning up message channel');
            supabase.removeChannel(channel);
            cleanupChat();
        };
    }, [friendId, currentUser?.id, isGroup, chatKey]);

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

    // ✅ Pagination - Jab user upar scroll kare
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
