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

        const channelName = isGroup 
            ? `group-chat-${friendId}-${currentUser.id}` 
            : `p2p-chat-${[currentUser.id, friendId].sort().join('-')}`;
        
        console.log('[DEBUG] ChatRoom: Subscribing to messages on channel:', channelName);
        const channel = supabase.channel(channelName);

        useChatStore.setState({ activeChannel: channel });

        const handleInsert = async (payload: any) => {
            const newMsg = payload.new;
            const isRelevant = isGroup
                ? (newMsg.group_id === friendId && newMsg.sender_id !== currentUser.id)
                : (newMsg.sender_id === friendId && newMsg.receiver_id === currentUser.id);

            if (isRelevant) {
                const msgId = newMsg.id;
                if (processedMessageIds.has(msgId)) return;
                processedMessageIds.add(msgId);
                if (processedMessageIds.size > 1000) {
                    const firstItem = processedMessageIds.values().next().value;
                    if (firstItem) processedMessageIds.delete(firstItem);
                }
                
                const currentKey = useChatStore.getState().chatKey;
                if (!currentKey && !isGroup) {
                    loadMessages(friendId, currentUser, isGroup);
                    return;
                }

                try {
                    let decryptedReply = null;
                    if (newMsg.reply_to_id) {
                        const { data: replyData } = await supabase
                            .from('messages')
                            .select('id, message, sender_id, created_at, group_id, key_version')
                            .eq('id', newMsg.reply_to_id)
                            .single();
                        
                        if (replyData) {
                            decryptedReply = replyData;
                        }
                    }

                    // Import decryptMessageBatch dynamically to avoid circular dependencies if any, 
                    // or just import at the top of the file. Assuming it's imported at the top.
                    const { decryptMessageBatch } = require('@/utils/chatHelpers');
                    
                    const rawMsg = { ...newMsg, reply: decryptedReply };
                    const [finalDecryptedMsg] = await decryptMessageBatch([rawMsg], currentKey, currentUser.id);

                    const finalMsg: any = { 
                        ...finalDecryptedMsg,
                        sender: { id: newMsg.sender_id } 

                    };

                    useChatStore.setState((state) => {
                        const existingIdx = state.messages.findIndex(m => m.id === finalMsg.id);
                        if (existingIdx !== -1) {
                            const newMessages = [...state.messages];
                            newMessages[existingIdx] = { ...newMessages[existingIdx], ...finalMsg };
                            return { messages: newMessages };
                        }
                        // Append at end to keep store in ASC order (oldest → newest)
                        return { messages: [...state.messages, finalMsg] };
                    });

                    const { db } = useDbStore.getState();
                    if (db) {
                        saveLocalMessage(db, finalMsg);
                        syncLedgerExpense(db, finalMsg, currentUser.id);
                        await markMessageDeliveredLocally(db, finalMsg.id);
                    }

                    const now = new Date().toISOString();
                    
                    // 🚀 FIRE BROADCAST INSTANTLY (Bypass DB Latency for Double Ticks)
                    channel.send({
                        type: 'broadcast',
                        event: 'status_update',
                        payload: {
                            status: 'delivered',
                            message_ids: [finalMsg.id],
                            user_id: currentUser.id
                        }
                    });

                    supabase
                        .from('messages')
                        .update({ status: 'delivered', delivered_at: now })
                        .eq('id', finalMsg.id)
                        .eq('status', 'sent')
                        .catch(() => {});

                    useChatStore.getState().markAsRead(finalMsg.id, currentUser, friendId, isGroup);
                } catch (e) {
                    loadMessages(friendId, currentUser, isGroup);
                }
            }
        };

        const handleUpdate = async (payload: any) => {
            const updatedMsg = payload.new;
            const isRelevant = isGroup
                ? updatedMsg.group_id === friendId
                : (updatedMsg.sender_id === currentUser.id && updatedMsg.receiver_id === friendId) ||
                (updatedMsg.sender_id === friendId && updatedMsg.receiver_id === currentUser.id);

            if (isRelevant) {
                const statusOrder = { 'sent': 1, 'delivered': 2, 'read': 3 };
                const newStatus = updatedMsg.is_read ? 'read' : updatedMsg.status;

                let decryptedText = updatedMsg.message;
                if (decryptedText && decryptedText.includes('SYSTEM_MSG: DELETED')) {
                    decryptedText = 'SYSTEM_MSG: DELETED';
                } else if (updatedMsg.message && typeof updatedMsg.message === 'string' && updatedMsg.message.trim().startsWith('{')) {
                    const currentKey = useChatStore.getState().chatKey;
                    if (currentKey) {
                        try { decryptedText = await decryptText(updatedMsg.message, currentKey); } catch (e) {}
                    }
                }

                useChatStore.setState((state) => {
                    const idx = state.messages.findIndex(msg => msg.id === updatedMsg.id);
                    if (idx === -1) return {};

                    const msg = state.messages[idx];
                    const currentStatus = msg.status || 'sent';
                    
                    const isStatusUpdate = (statusOrder[newStatus as keyof typeof statusOrder] ?? 0) > (statusOrder[currentStatus as keyof typeof statusOrder] ?? 0);
                    const isEditUpdate = decryptedText && msg.message !== decryptedText;

                    if (!isStatusUpdate && !isEditUpdate && !updatedMsg.reactions) {
                        return {};
                    }

                    const newMessages = [...state.messages];
                    newMessages[idx] = {
                        ...msg,
                        status: isStatusUpdate ? newStatus : msg.status,
                        is_read: isStatusUpdate ? updatedMsg.is_read : msg.is_read,
                        delivered_at: updatedMsg.delivered_at || msg.delivered_at,
                        read_at: updatedMsg.read_at || msg.read_at,
                        message: decryptedText || msg.message,
                        is_edited: isEditUpdate ? true : msg.is_edited,
                        reactions: updatedMsg.reactions || msg.reactions
                    };
                    
                    if (decryptedText === 'SYSTEM_MSG: DELETED') {
                        newMessages[idx].file_url = null;
                    }

                    return { messages: newMessages };
                });
            }
        };

        const handleDelete = (payload: any) => {
            const deletedMsg = payload.old;
            useChatStore.setState((state) => ({
                messages: state.messages.filter(m => m.id !== deletedMsg.id)
            }));
        };

        // Attach listeners with DB filters
        if (isGroup) {
            channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${friendId}` }, handleInsert);
            channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `group_id=eq.${friendId}` }, handleUpdate);
            channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `group_id=eq.${friendId}` }, handleDelete);
        } else {
            // Receive messages sent to us (Filter by sender_id to avoid Supabase duplicate filter drop issue)
            channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${friendId}` }, handleInsert);
            channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=eq.${friendId}` }, handleUpdate);
            channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `sender_id=eq.${friendId}` }, handleDelete);
            
            // Receive updates/read receipts for messages WE sent
            channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=eq.${currentUser.id}` }, handleUpdate);
        }

        // Ephemeral Broadcast Listeners (Typing & Reactions & Status)
        channel
            .on('broadcast', { event: 'typing' }, (payload) => {
                const data = payload.payload || payload;
                if (data.user_id === friendId) {
                    useChatStore.setState({ isTyping: data.is_typing });
                }
            })
            .on('broadcast', { event: 'message_reaction' }, (payload) => {
                const { message_id, emoji, reactions } = payload.payload;
                useChatStore.setState((state) => ({
                    messages: state.messages.map(m => m.id === message_id ? { ...m, reactions } : m)
                }));
                setFlyingEmoji({ emoji, messageId: message_id, id: Date.now() });
                setTimeout(() => setFlyingEmoji(null), 2000);
            })
            .on('broadcast', { event: 'status_update' }, (payload) => {
                const { status, message_ids, user_id } = payload.payload;
                // user_id is the person who updated the status (the receiver)
                // If the status update comes from our friend, it means OUR messages were read/delivered by them.
                if (user_id === friendId || isGroup) {
                    const statusOrder = { 'sent': 1, 'delivered': 2, 'read': 3 };
                    const newWeight = statusOrder[status as keyof typeof statusOrder] || 0;
                    
                    useChatStore.setState((state) => {
                        let changed = false;
                        const newMessages = state.messages.map(m => {
                            // Only update our own messages
                            if (m.sender_id !== currentUser.id) return m;
                            
                            // If specific messages were provided, only update those
                            if (message_ids && message_ids.length > 0 && !message_ids.includes(m.id)) return m;
                            
                            const currentWeight = statusOrder[m.status as keyof typeof statusOrder] || 0;
                            if (newWeight > currentWeight) {
                                changed = true;
                                return { 
                                    ...m, 
                                    status, 
                                    is_read: status === 'read' ? true : m.is_read,
                                    delivered_at: status === 'delivered' && !m.delivered_at ? new Date().toISOString() : m.delivered_at,
                                    read_at: status === 'read' && !m.read_at ? new Date().toISOString() : m.read_at
                                };
                            }
                            return m;
                        });
                        
                        return changed ? { messages: newMessages } : {};
                    });
                }
            })
            .subscribe();

        loadMessages(friendId, currentUser, isGroup);

        return () => {
            console.log('[DEBUG] ChatRoom: Cleaning up message channel');
            supabase.removeChannel(channel);
            cleanupChat();
        };
    }, [friendId, currentUser?.id, isGroup]);
};
