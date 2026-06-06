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
                        return { messages: [finalMsg, ...state.messages] };
                    });

                    const { db } = useDbStore.getState();
                    if (db) {
                        saveLocalMessage(db, finalMsg);
                        syncLedgerExpense(db, finalMsg, currentUser.id);
                        await markMessageDeliveredLocally(db, finalMsg.id);
                    }

                    const now = new Date().toISOString();
                    supabase
                        .from('messages')
                        .update({ status: 'delivered', delivered_at: now })
                        .eq('id', finalMsg.id)
                        .eq('status', 'sent')
                        .then(() => {})
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
            // Receive messages sent to us
            channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUser.id}` }, handleInsert);
            channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUser.id}` }, handleUpdate);
            channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUser.id}` }, handleDelete);
            
            // Receive updates/read receipts for messages WE sent
            channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=eq.${currentUser.id}` }, handleUpdate);
        }

        // Ephemeral Broadcast Listeners (Typing & Reactions)
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
            .subscribe();

        loadMessages(friendId, currentUser, isGroup);

        return () => {
            console.log('[DEBUG] ChatRoom: Cleaning up message channel');
            supabase.removeChannel(channel);
            cleanupChat();
        };
    }, [friendId, currentUser?.id, isGroup]);
};
