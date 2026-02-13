import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';
import { getChatKey, decryptText, encryptText } from '@/utils/chatCrypto';
import { uploadChatMessageMedia } from '../utils/uploadHelper';

export const useChatRoom = (friendId: string, currentUser: any, isGroup: boolean = false) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [flyingEmoji, setFlyingEmoji] = useState<any>(null);
    const [chatKey, setChatKey] = useState<Uint8Array | null>(null);
    const [isKeyInitializing, setIsKeyInitializing] = useState(false);
    const channelRef = useRef<any>(null);
    const PAGE_SIZE = 50;

    // 0. Initialize Chat Key
    useEffect(() => {
        const initKey = async () => {
            if (currentUser && friendId) {
                try {
                    const key = await getChatKey(currentUser.id, friendId, isGroup);
                    setChatKey(key);
                } catch (err) {
                    console.error("useChatRoom: Key error:", err);
                }
            }
        };
        initKey();
    }, [currentUser?.id, friendId, isGroup]);

    // 1. Mark as delivered (Only for personal chats)
    const markAsDelivered = useCallback(async () => {
        if (!friendId || !currentUser || isGroup) return;

        await supabase
            .from('messages')
            .update({ status: 'delivered' })
            .eq('status', 'sent')
            .eq('receiver_id', currentUser.id)
            .eq('sender_id', friendId);

    }, [friendId, currentUser, isGroup]);

    // 2. Mark as read
    const markAsRead = useCallback(async (messageId: string) => {
        if (!currentUser || !friendId) return;

        let query = supabase
            .from('messages')
            .update({ status: 'read', is_read: true })
            .eq('id', messageId);

        if (!isGroup) {
            query = query.eq('receiver_id', currentUser.id);
        }

        const { error } = await query;

        if (!error && channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'status_update',
                payload: {
                    message_id: messageId,
                    sender_id: currentUser.id,
                    receiver_id: isGroup ? null : friendId,
                    group_id: isGroup ? friendId : null,
                    status: 'read'
                }
            });
        }
    }, [currentUser, friendId, isGroup]);

    // 3. Load Messages
    const loadMessages = useCallback(async () => {
        if (!friendId || !currentUser || !chatKey) {
            console.log('useChatRoom: Skipping loadMessages - missing deps:', { friendId: !!friendId, user: !!currentUser, key: !!chatKey });
            return;
        }

        console.log('useChatRoom: Loading messages for:', friendId);
        setLoading(true);
        try {
            let query = supabase
                .from('messages')
                .select(`
                    *,
                    sender:profiles!sender_id(id, username, avatar_url),
                    reply:messages!reply_to_id(id, message, sender_id, created_at)
                `);

            if (isGroup) {
                query = query.eq('group_id', friendId);
            } else {
                query = query.or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUser.id})`);
            }

            const { data, error } = await query
                .order('created_at', { ascending: true })
                .range(0, PAGE_SIZE);

            if (error) {
                console.error('useChatRoom: Supabase query error:', error);
                throw error;
            }

            console.log('useChatRoom: Fetched', data?.length || 0, 'messages. Decrypting...');

            // 🔓 Decrypt all messages
            const decryptedMessages = await Promise.all((data || []).map(async (msg) => {
                try {
                    const decryptedText = await decryptText(msg.message, chatKey);
                    let decryptedReply = null;

                    if (msg.reply) {
                        try {
                            const replyText = await decryptText(msg.reply.message, chatKey);
                            decryptedReply = { ...msg.reply, message: replyText };
                        } catch (e) {
                            decryptedReply = { ...msg.reply, message: '[Encrypted Reply]' };
                        }
                    }

                    return { ...msg, message: decryptedText, reply: decryptedReply };
                } catch (e) {
                    console.warn('useChatRoom: Message decryption failed for msg:', msg.id);
                    return { ...msg, message: '[Encrypted Message]' };
                }
            }));

            setMessages(decryptedMessages);

            // Mark unseen messages as read
            const unreadIds = (data || [])
                .filter(m => (isGroup ? m.sender_id !== currentUser.id : m.sender_id === friendId) && !m.is_read)
                .map(m => m.id);

            if (unreadIds.length > 0) {
                await supabase
                    .from('messages')
                    .update({ is_read: true, status: 'read' })
                    .in('id', unreadIds);
            }
        } catch (error: any) {
            console.error('Error loading messages:', error.message);
        } finally {
            setLoading(false);
        }
    }, [friendId, currentUser, chatKey, isGroup]);

    // 4. Send Message
    const handleSendMessage = async (text: string, replyToId?: string) => {
        if (!text.trim() || !friendId || !currentUser || !chatKey) return;

        const tempId = `temp-${Date.now()}`;
        let messageToEncrypt = text;

        const tempMsg = {
            id: tempId,
            message: text,
            sender_id: currentUser.id,
            receiver_id: isGroup ? null : friendId,
            group_id: isGroup ? friendId : null,
            status: 'sending',
            reply_to_id: replyToId,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, tempMsg]);

        try {
            // 🎙️ Handle Voice Message / Image Upload
            if (text.startsWith('[Voice Message]') || text.startsWith('[Image]')) {
                const parts = text.split(' ');
                // For [Voice Message] it's index 2, for [Image] it's index 1
                const localUri = text.startsWith('[Voice Message]') ? parts[2] : parts[1];
                const type = text.startsWith('[Voice Message]') ? 'voice' : 'image';

                if (localUri && (localUri.startsWith('file://') || localUri.startsWith('content://'))) {
                    try {
                        const publicUrl = await uploadChatMessageMedia(localUri, type);
                        messageToEncrypt = text.replace(localUri, publicUrl);
                    } catch (uploadError) {
                        console.error('Media upload failed:', uploadError);
                        throw new Error('Failed to upload media. Please try again.');
                    }
                }
            }

            const encryptedText = await encryptText(messageToEncrypt, chatKey);

            const insertData: any = {
                sender_id: currentUser.id,
                message: encryptedText,
                status: 'sent',
                is_read: false,
                reply_to_id: replyToId
            };

            if (isGroup) {
                insertData.group_id = friendId;
            } else {
                insertData.receiver_id = friendId;
            }

            const { data, error } = await supabase
                .from('messages')
                .insert([insertData])
                .select()
                .single();

            if (error) throw error;

            console.log('useChatRoom: Message inserted, broadcasting...');

            setMessages(prev => prev.map(m => m.id === tempId ? { ...data, message: text } : m));

            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'new_message',
                    payload: { ...data, message: text } // Send plain text in broadcast for immediate display
                });
            }
        } catch (error: any) {
            console.error('useChatRoom: Send error:', error);
            setMessages(prev => prev.filter(m => m.id !== tempId));
            Alert.alert('Error', 'Failed to send message');
        }
    };

    // 5. React to Message
    const handleReact = async (messageId: string, emoji: string) => {
        if (!currentUser) return;

        try {
            const msg = messages.find(m => m.id === messageId);
            if (!msg) return;

            const reactions = msg.reactions || {};
            reactions[emoji] = (reactions[emoji] || 0) + 1;

            const { error } = await supabase
                .from('messages')
                .update({ reactions })
                .eq('id', messageId);

            if (error) throw error;

            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));

            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'message_reaction',
                    payload: { message_id: messageId, emoji, reactions }
                });
            }

            // Trigger flying emoji locally
            setFlyingEmoji({ emoji, messageId, id: Date.now() });
            setTimeout(() => setFlyingEmoji(null), 2000);
        } catch (err) {
            console.error("Reaction error:", err);
        }
    };

    // 6. Edit Message
    const handleSaveEdit = async (messageId: string, newText: string) => {
        if (!chatKey || !currentUser) return;

        try {
            const encryptedText = await encryptText(newText, chatKey);
            const { error } = await supabase
                .from('messages')
                .update({
                    message: encryptedText,
                    is_edited: true,
                    edited_at: new Date().toISOString()
                })
                .eq('id', messageId);

            if (error) throw error;

            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, message: newText, is_edited: true } : m));

            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'message_edit',
                    payload: { message_id: messageId, message: encryptedText }
                });
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to update message');
        }
    };

    // 7. Delete Message
    const handleDeleteMessage = async (messageId: string) => {
        try {
            const { error } = await supabase
                .from('messages')
                .delete()
                .eq('id', messageId);

            if (error) throw error;

            setMessages(prev => prev.filter(m => m.id !== messageId));

            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'message_delete',
                    payload: { message_id: messageId }
                });
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to delete message');
        }
    };

    // 8. Forward Message
    const handleForwardMessage = async (messageText: string, friendIds: string[]) => {
        if (!currentUser) return;

        try {
            const promises = friendIds.map(async (fid) => {
                const fKey = await getChatKey(currentUser.id, fid);
                const encText = await encryptText(messageText, fKey);
                return supabase.from('messages').insert({
                    sender_id: currentUser.id,
                    receiver_id: fid,
                    message: encText,
                    status: 'sent',
                    is_read: false
                });
            });

            await Promise.all(promises);
        } catch (err) {
            Alert.alert('Error', 'Failed to forward message');
        }
    };

    // Throttled typing
    const lastTypingSentRef = useRef(0);
    const typingTimeoutRef = useRef<any>(null);

    const handleTypingStatus = (typing: boolean) => {
        if (!channelRef.current) return;

        if (typing) {
            const now = Date.now();
            if (now - lastTypingSentRef.current > 3000) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'typing',
                    payload: { user_id: currentUser.id, is_typing: true }
                });
                lastTypingSentRef.current = now;
            }

            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'typing',
                    payload: { user_id: currentUser.id, is_typing: false }
                });
                lastTypingSentRef.current = 0;
            }, 2000);
        } else {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            channelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { user_id: currentUser.id, is_typing: false }
            });
            lastTypingSentRef.current = 0;
        }
    };

    // 9. Subscription Setup
    useEffect(() => {
        if (!friendId || !currentUser || !chatKey) return;

        const logPrefix = `[Chat:${friendId.substring(0, 4)}]`;
        const channelName = isGroup ? `group-${friendId}` : `chat-${[currentUser.id, friendId].sort().join('-')}`;

        console.log(`${logPrefix} Subscribing to channel: ${channelName}`);

        const channel = supabase
            .channel(channelName)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, async (payload) => {
                const newMsg = payload.new;
                const isRelevant = isGroup
                    ? newMsg.group_id === friendId
                    : (newMsg.sender_id === friendId && newMsg.receiver_id === currentUser.id) ||
                    (newMsg.sender_id === currentUser.id && newMsg.receiver_id === friendId);

                if (isRelevant) {
                    console.log(`${logPrefix} New message via DB:`, newMsg.id);
                    // Only decrypt if it's not already in local state (from broadcast)
                    setMessages(prev => {
                        if (prev.some(m => m.id === newMsg.id)) return prev;

                        // Decrypt in background if it's a new database insert
                        decryptText(newMsg.message, chatKey).then(decryptedText => {
                            setMessages(innerPrev => {
                                if (innerPrev.some(m => m.id === newMsg.id)) return innerPrev;
                                return [...innerPrev, { ...newMsg, message: decryptedText }];
                            });
                        }).catch(err => {
                            console.warn(`${logPrefix} Decryption error:`, err);
                        });

                        return prev;
                    });

                    if (newMsg.sender_id !== currentUser.id) {
                        markAsRead(newMsg.id);
                    }
                }
            })
            .on('broadcast', { event: 'new_message' }, async (payload) => {
                const msg = payload.payload;
                if (msg.sender_id === currentUser.id) return; // Ignore our own broadcast

                console.log(`${logPrefix} New message via Broadcast:`, msg.id);
                setMessages(prev => {
                    if (prev.some(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });

                if (msg.sender_id !== currentUser.id) {
                    markAsRead(msg.id);
                }
            })
            .on('broadcast', { event: 'typing' }, (payload) => {
                // Support both nested and flat payload
                const data = payload.payload || payload;
                if (data.user_id === friendId) {
                    setIsTyping(data.is_typing);
                }
            })
            .on('broadcast', { event: 'status_update' }, (payload) => {
                console.log(`${logPrefix} Status update via broadcast:`, payload.payload);
                const update = payload.payload;
                setMessages(prev => prev.map(msg => {
                    if (msg.id === update.message_id || (msg.sender_id === currentUser.id && update.status === 'read')) {
                        return { ...msg, status: update.status };
                    }
                    return msg;
                }));
            })
            .on('broadcast', { event: 'message_reaction' }, (payload) => {
                const { message_id, emoji, reactions } = payload.payload;
                setMessages(prev => prev.map(m => m.id === message_id ? { ...m, reactions } : m));

                // Trigger flying emoji for incoming reactions
                setFlyingEmoji({ emoji, messageId: message_id, id: Date.now() });
                setTimeout(() => setFlyingEmoji(null), 2000);
            })
            .on('broadcast', { event: 'message_edit' }, async (payload) => {
                const { message_id, message: encText } = payload.payload;
                const decText = await decryptText(encText, chatKey);
                setMessages(prev => prev.map(m => m.id === message_id ? { ...m, message: decText, is_edited: true } : m));
            })
            .on('broadcast', { event: 'message_delete' }, (payload) => {
                const { message_id } = payload.payload;
                setMessages(prev => prev.filter(m => m.id !== message_id));
            })
            .subscribe((status) => {
                console.log(`${logPrefix} Subscription status:`, status);
            });

        channelRef.current = channel;
        loadMessages();
        markAsDelivered();

        return () => {
            console.log(`${logPrefix} Cleaning up channel:`, channelName);
            supabase.removeChannel(channel);
        };
    }, [friendId, currentUser, chatKey, isGroup, loadMessages, markAsDelivered, markAsRead]);

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
        loadMore: loadMessages
    };
};
