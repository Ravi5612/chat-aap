import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/store/useChatStore';
import { decryptText } from '@/utils/chatCrypto';
import { useDbStore } from '@/store/useDbStore';
import { saveLocalMessage, syncLedgerExpense, markMessageDeliveredLocally } from '@/lib/localDb';

const processedMessageIds = new Set<string>();

export const useChatRealtime = (friendId: string, currentUser: any, isGroup: boolean) => {
    const { chatKey, loadMessages, cleanupChat, setFlyingEmoji } = useChatStore();

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
                    ? (newMsg.group_id === friendId && newMsg.sender_id !== currentUser.id)
                    : (newMsg.sender_id === friendId && newMsg.receiver_id === currentUser.id);

                if (isRelevant) {
                    const msgId = newMsg.id;
                    if (processedMessageIds.has(msgId)) {
                        console.log('[REALTIME] postgres_changes message already processed/processing:', msgId);
                        return;
                    }
                    processedMessageIds.add(msgId);
                    if (processedMessageIds.size > 1000) {
                        const firstItem = processedMessageIds.values().next().value;
                        if (firstItem) processedMessageIds.delete(firstItem);
                    }
                    
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

                        let decryptedReply = null;
                        if (newMsg.reply_to_id) {
                            const { data: replyData } = await supabase
                                .from('messages')
                                .select('id, message, sender_id, created_at')
                                .eq('id', newMsg.reply_to_id)
                                .single();
                            
                            if (replyData) {
                                try {
                                    const replyText = await decryptText(replyData.message, currentKey);
                                    decryptedReply = { ...replyData, message: replyText };
                                } catch (e) {
                                    decryptedReply = replyData;
                                }
                            }
                        }

                        const finalMsg: any = { 
                            ...newMsg, 
                            message: decryptedText,
                            file_url: decryptedFileUrl,
                            reply: decryptedReply,
                            sender: { id: newMsg.sender_id } 
                        };

                        useChatStore.setState((state) => {
                            const existingIdx = state.messages.findIndex(m => m.id === finalMsg.id);
                            if (existingIdx !== -1) {
                                const newMessages = [...state.messages];
                                newMessages[existingIdx] = { ...newMessages[existingIdx], ...finalMsg };
                                return { messages: newMessages };
                            }
                            return { messages: [...state.messages, finalMsg] };
                        });

                        // Save to Local DB
                        const { db } = useDbStore.getState();
                        if (db) {
                            saveLocalMessage(db, finalMsg);
                            syncLedgerExpense(db, finalMsg, currentUser.id);
                            
                            // ✅ DELIVERED FLOW
                            await markMessageDeliveredLocally(db, finalMsg.id);
                        }

                        // Update Supabase in background
                        const now = new Date().toISOString();
                        supabase
                            .from('messages')
                            .update({ status: 'delivered', delivered_at: now })
                            .eq('id', finalMsg.id)
                            .eq('status', 'sent')
                            .then(() => console.log('[DELIVERED] Supabase updated:', finalMsg.id))
                            .catch(e => console.warn('[DELIVERED] Supabase update failed:', e));

                        // Broadcast 'delivered'
                        channel.send({
                            type: 'broadcast',
                            event: 'status_update',
                            payload: {
                                message_id: finalMsg.id,
                                sender_id: currentUser.id,
                                status: 'delivered',
                                delivered_at: now
                            }
                        });

                        // Mark as read
                        useChatStore.getState().markAsRead(finalMsg.id, currentUser, friendId, isGroup);
                    } catch (e) {
                        console.error("ChatRoom: Realtime decryption failed", e);
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

                    useChatStore.setState((state) => {
                        const idx = state.messages.findIndex(msg => msg.id === updatedMsg.id);
                        if (idx === -1) return {};

                        const msg = state.messages[idx];
                        const currentStatus = msg.status || 'sent';
                        if ((statusOrder[newStatus as keyof typeof statusOrder] ?? 0) <=
                            (statusOrder[currentStatus as keyof typeof statusOrder] ?? 0)) {
                            return {};
                        }

                        const newMessages = [...state.messages];
                        newMessages[idx] = {
                            ...msg,
                            status: newStatus,
                            is_read: updatedMsg.is_read,
                            delivered_at: updatedMsg.delivered_at,
                            read_at: updatedMsg.read_at
                        };
                        return { messages: newMessages };
                    });
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

                const isRelevant = isGroup 
                    ? msg.group_id === friendId 
                    : (msg.sender_id === friendId && msg.receiver_id === currentUser.id);
                
                if (!isRelevant) return;

                const msgId = msg.id;
                if (processedMessageIds.has(msgId)) {
                    console.log('[REALTIME] broadcast message already processed/processing:', msgId);
                    return;
                }
                processedMessageIds.add(msgId);
                if (processedMessageIds.size > 1000) {
                    const firstItem = processedMessageIds.values().next().value;
                    if (firstItem) processedMessageIds.delete(firstItem);
                }

                try {
                    const currentKey = useChatStore.getState().chatKey;
                    if (!currentKey) return;

                    let finalMsg = { ...msg };

                    if (msg.message && typeof msg.message === 'string' && msg.message.trim().startsWith('{')) {
                        try { finalMsg.message = await decryptText(msg.message, currentKey); } catch (err) {}
                    }

                    if (msg.file_url && typeof msg.file_url === 'string' && msg.file_url.trim().startsWith('{')) {
                        try { finalMsg.file_url = await decryptText(msg.file_url, currentKey); } catch (err) {}
                    }

                    useChatStore.setState((state) => {
                        const existingIdx = state.messages.findIndex(m => m.id === finalMsg.id);
                        if (existingIdx !== -1) {
                            const newMessages = [...state.messages];
                            newMessages[existingIdx] = { ...newMessages[existingIdx], ...finalMsg };
                            return { messages: newMessages };
                        }
                        return { messages: [...state.messages, finalMsg] };
                    });

                    const { db } = useDbStore.getState();
                    if (db) saveLocalMessage(db, finalMsg);

                    if (db) {
                        await markMessageDeliveredLocally(db, finalMsg.id);
                    }

                    const now = new Date().toISOString();
                    supabase
                        .from('messages')
                        .update({ status: 'delivered', delivered_at: now })
                        .eq('id', finalMsg.id)
                        .eq('status', 'sent')
                        .then(() => {})
                        .catch(e => console.warn('[DELIVERED] Supabase update failed:', e));

                    channel.send({
                        type: 'broadcast',
                        event: 'status_update',
                        payload: { message_id: finalMsg.id, sender_id: currentUser.id, status: 'delivered', delivered_at: now }
                    });

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

                useChatStore.setState((state) => {
                    let changed = false;
                    const newMessages = state.messages.map(msg => {
                        const isMyMessage = msg.sender_id === currentUser.id;
                        if (!isMyMessage) return msg;

                        const isMatch = isGroup
                            ? msg.group_id === update.group_id
                            : (msg.receiver_id === update.sender_id);

                        if (isMatch) {
                            if (update.message_id && msg.id !== update.message_id) return msg;

                            const currentStatus = msg.status || 'sent';
                            if ((statusOrder[newStatus as keyof typeof statusOrder] ?? 0) >
                                (statusOrder[currentStatus as keyof typeof statusOrder] ?? 0)) {
                                changed = true;
                                return { 
                                    ...msg, 
                                    status: newStatus, 
                                    is_read: newStatus === 'read',
                                    delivered_at: update.delivered_at || msg.delivered_at,
                                    read_at: update.read_at || msg.read_at
                                };
                            }
                        }
                        return msg;
                    });
                    return changed ? { messages: newMessages } : {};
                });
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
                const currentKey = useChatStore.getState().chatKey;
                if (currentKey) {
                    const decText = await decryptText(encText, currentKey);
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
    }, [friendId, currentUser?.id, isGroup]); // Removed chatKey to prevent channel recreation
};
