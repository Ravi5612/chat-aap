import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';
import { getChatKey, encryptText, decryptText } from '@/utils/chatCrypto';

export const useChatRoom = (friendId: string, currentUser: any, isGroup: boolean = false) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [chatKey, setChatKey] = useState<Uint8Array | null>(null);
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
                    console.error("Key derivation error:", err);
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
        if (!friendId || !currentUser || !chatKey) return;

        setLoading(true);
        try {
            let query = supabase
                .from('messages')
                .select(`
                    *,
                    sender:profiles!sender_id(id, username, avatar_url)
                `);

            if (isGroup) {
                query = query.eq('group_id', friendId);
            } else {
                query = query.or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUser.id})`);
            }

            const { data, error } = await query
                .order('created_at', { ascending: true })
                .range(0, PAGE_SIZE);

            if (error) throw error;

            // 🔓 Decrypt all messages
            const decryptedMessages = await Promise.all((data || []).map(async (msg) => {
                const decryptedText = await decryptText(msg.message, chatKey);
                return { ...msg, message: decryptedText };
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
            const encryptedText = await encryptText(text, chatKey);

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

            setMessages(prev => prev.map(m => m.id === tempId ? { ...data, message: text } : m));

            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'new_message',
                    payload: { ...data, message: encryptedText }
                });
            }
        } catch (error: any) {
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

    // 9. Subscription Setup
    useEffect(() => {
        if (!friendId || !currentUser || !chatKey) return;

        const channelName = isGroup ? `group-${friendId}` : `chat-${[currentUser.id, friendId].sort().join('-')}`;

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
                    const decryptedText = await decryptText(newMsg.message, chatKey);
                    const msgWithDecryptedText = { ...newMsg, message: decryptedText };

                    setMessages(prev => {
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        return [...prev, msgWithDecryptedText];
                    });

                    if (newMsg.sender_id !== currentUser.id) {
                        markAsRead(newMsg.id);
                    }
                }
            })
            .on('broadcast', { event: 'typing' }, (payload) => {
                if (payload.payload.user_id !== currentUser.id) {
                    setIsTyping(payload.payload.is_typing);
                }
            })
            .on('broadcast', { event: 'status_update' }, (payload) => {
                const update = payload.payload;
                setMessages(prev => prev.map(msg => {
                    if (msg.id === update.message_id || (msg.sender_id === currentUser.id && update.status === 'read')) {
                        return { ...msg, status: update.status };
                    }
                    return msg;
                }));
            })
            .on('broadcast', { event: 'message_reaction' }, (payload) => {
                const { message_id, reactions } = payload.payload;
                setMessages(prev => prev.map(m => m.id === message_id ? { ...m, reactions } : m));
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
            .subscribe();

        channelRef.current = channel;
        loadMessages();
        markAsDelivered();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [friendId, currentUser, chatKey, isGroup, loadMessages, markAsDelivered, markAsRead]);

    const handleTypingStatus = (typing: boolean) => {
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { user_id: currentUser.id, is_typing: typing }
            });
        }
    };

    return {
        messages,
        loading,
        isTyping,
        handleSendMessage,
        handleReact,
        handleSaveEdit,
        handleDeleteMessage,
        handleForwardMessage,
        handleTypingStatus,
        loadMore: loadMessages
    };
};
