import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';
import { getChatKey, decryptText, encryptText } from '@/utils/chatCrypto';
import { uploadChatMessageMedia } from '../utils/uploadHelper';

interface ChatState {
    messages: any[];
    loading: boolean;
    isTyping: boolean;
    flyingEmoji: any;
    chatKey: Uint8Array | null;
    activeChannel: any | null;

    // Actions
    initChat: (friendId: string, currentUser: any, isGroup: boolean) => Promise<void>;
    loadMessages: (friendId: string, currentUser: any, isGroup: boolean) => Promise<void>;
    sendMessage: (text: string, friendId: string, currentUser: any, isGroup: boolean, replyToId?: string) => Promise<void>;
    reactToMessage: (messageId: string, emoji: string, currentUser: any) => Promise<void>;
    saveEdit: (messageId: string, newText: string, currentUser: any) => Promise<void>;
    deleteMessage: (messageId: string) => Promise<void>;
    forwardMessage: (messageText: string, friendIds: string[], currentUser: any) => Promise<void>;
    setTypingStatus: (typing: boolean, friendId: string, currentUser: any) => void;
    cleanupChat: () => void;
    setFlyingEmoji: (emoji: any) => void;
}

export const useChatStore = create<ChatState>((set, get) => {
    let typingTimeout: any = null;
    let lastTypingSent = 0;

    return {
        messages: [],
        loading: false,
        isTyping: false,
        flyingEmoji: null,
        chatKey: null,
        activeChannel: null,

        setFlyingEmoji: (flyingEmoji) => set({ flyingEmoji }),

        initChat: async (friendId, currentUser, isGroup) => {
            if (!currentUser || !friendId) return;
            try {
                const key = await getChatKey(currentUser.id, friendId, isGroup);
                set({ chatKey: key });
            } catch (err) {
                console.error("ChatStore: Key error:", err);
            }
        },

        loadMessages: async (friendId, currentUser, isGroup) => {
            const { chatKey } = get();
            if (!friendId || !currentUser || !chatKey) return;

            set({ loading: true });
            try {
                let query = supabase
                    .from('messages')
                    .select(`
            *,
            sender:profiles!sender_id(id, username, avatar_url),
            reply:messages!reply_to_id(id, message, sender_id, created_at),
            status_context:status_id(id, user_id, media_type, media_url, content)
          `);

                if (isGroup) {
                    query = query.eq('group_id', friendId);
                } else {
                    query = query.or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUser.id})`);
                }

                const { data, error } = await query
                    .order('created_at', { ascending: true })
                    .range(0, 50);

                if (error) throw error;

                const decryptedMessages = await Promise.all((data || []).map(async (msg) => {
                    try {
                        let decryptedText = msg.message;
                        if (msg.message && typeof msg.message === 'string' && (msg.message.startsWith('{') || !msg.message.startsWith('SYSTEM_MSG:'))) {
                            try {
                                decryptedText = await decryptText(msg.message, chatKey);
                            } catch (e) {
                                decryptedText = msg.message;
                            }
                        }

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
                        return { ...msg, message: msg.message || '[Encrypted Message]' };
                    }
                }));

                set({ messages: decryptedMessages, loading: false });

                // Mark as read
                const unreadIds = (data || [])
                    .filter(m => (isGroup ? m.sender_id !== currentUser.id : m.sender_id === friendId) && !m.is_read)
                    .map(m => m.id);

                if (unreadIds.length > 0) {
                    await supabase.from('messages').update({ is_read: true, status: 'read' }).in('id', unreadIds);
                }
            } catch (error: any) {
                console.error('ChatStore: Load error:', error.message);
                set({ loading: false });
            }
        },

        sendMessage: async (text, friendId, currentUser, isGroup, replyToId) => {
            const { chatKey, activeChannel, messages } = get();
            if ((!text || !text.trim()) && !text.startsWith('[Voice Message]') && !text.startsWith('[Image]') && !friendId || !currentUser || !chatKey) return;

            const tempId = `temp-${Date.now()}`;
            let messageToEncrypt = text;
            let fileData: any = null;

            // Handle metadata for optimistic UI
            const isVoice = text.startsWith('[Voice Message]');
            const isImage = text.startsWith('[Image]');
            const localUri = isVoice ? text.split(' ')[2] : (isImage ? text.split(' ')[1] : null);

            const tempMsg: any = {
                id: tempId,
                message: isVoice || isImage ? '' : text,
                sender_id: currentUser.id,
                receiver_id: isGroup ? null : friendId,
                group_id: isGroup ? friendId : null,
                status: 'sending',
                reply_to_id: replyToId,
                created_at: new Date().toISOString(),
                file_url: localUri,
                file_type: isVoice ? 'audio/m4a' : (isImage ? 'image/jpeg' : null)
            };

            set({ messages: [...messages, tempMsg] });

            try {
                if (isVoice || isImage) {
                    const type = isVoice ? 'voice' : 'image';
                    if (localUri && (localUri.startsWith('file://') || localUri.startsWith('content://'))) {
                        fileData = await uploadChatMessageMedia(localUri, type, currentUser.id);
                        messageToEncrypt = `Sent ${fileData.name || (isVoice ? 'a voice message' : 'an image')}`;
                    }
                }

                const encryptedText = await encryptText(messageToEncrypt, chatKey);
                const insertData: any = {
                    sender_id: currentUser.id,
                    message: encryptedText,
                    status: 'sent',
                    is_read: false,
                    reply_to_id: replyToId,
                    file_url: fileData?.url || null,
                    file_name: fileData?.name || null,
                    file_type: fileData?.type || null,
                    file_size: fileData?.size || null
                };
                if (isGroup) insertData.group_id = friendId;
                else insertData.receiver_id = friendId;

                const { data, error } = await supabase.from('messages').insert([insertData]).select().single();
                if (error) throw error;

                set((state) => ({
                    messages: state.messages.map(m => m.id === tempId ? { ...data, message: messageToEncrypt } : m)
                }));

                if (activeChannel) {
                    activeChannel.send({
                        type: 'broadcast',
                        event: 'new_message',
                        payload: { ...data, message: messageToEncrypt }
                    });
                }
            } catch (error: any) {
                console.error("SendMessage Error:", error);
                set((state) => ({ messages: state.messages.filter(m => m.id !== tempId) }));
                Alert.alert('Error', 'Failed to send message');
            }
        },

        reactToMessage: async (messageId, emoji, currentUser) => {
            const { messages, activeChannel } = get();
            if (!currentUser) return;
            try {
                const msg = messages.find(m => m.id === messageId);
                if (!msg) return;

                const reactions = { ...(msg.reactions || {}) };
                reactions[emoji] = (reactions[emoji] || 0) + 1;

                const { error } = await supabase.from('messages').update({ reactions }).eq('id', messageId);
                if (error) throw error;

                set({ messages: messages.map(m => m.id === messageId ? { ...m, reactions } : m) });

                if (activeChannel) {
                    activeChannel.send({
                        type: 'broadcast',
                        event: 'message_reaction',
                        payload: { message_id: messageId, emoji, reactions }
                    });
                }
            } catch (err) {
                console.error("ChatStore: Reaction error:", err);
            }
        },

        saveEdit: async (messageId, newText, currentUser) => {
            const { chatKey, activeChannel, messages } = get();
            if (!chatKey || !currentUser) return;
            try {
                const encryptedText = await encryptText(newText, chatKey);
                const { error } = await supabase.from('messages').update({
                    message: encryptedText,
                    is_edited: true,
                    edited_at: new Date().toISOString()
                }).eq('id', messageId);

                if (error) throw error;

                set({ messages: messages.map(m => m.id === messageId ? { ...m, message: newText, is_edited: true } : m) });

                if (activeChannel) {
                    activeChannel.send({
                        type: 'broadcast',
                        event: 'message_edit',
                        payload: { message_id: messageId, message: encryptedText }
                    });
                }
            } catch (err) {
                Alert.alert('Error', 'Failed to update message');
            }
        },

        deleteMessage: async (messageId) => {
            const { messages, activeChannel } = get();
            try {
                const { error } = await supabase.from('messages').delete().eq('id', messageId);
                if (error) throw error;

                set({ messages: messages.filter(m => m.id !== messageId) });

                if (activeChannel) {
                    activeChannel.send({
                        type: 'broadcast',
                        event: 'message_delete',
                        payload: { message_id: messageId }
                    });
                }
            } catch (err) {
                Alert.alert('Error', 'Failed to delete message');
            }
        },

        forwardMessage: async (messageText, friendIds, currentUser) => {
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
        },

        setTypingStatus: (typing, friendId, currentUser) => {
            const { activeChannel } = get();
            if (!activeChannel) return;

            if (typing) {
                const now = Date.now();
                if (now - lastTypingSent > 3000) {
                    activeChannel.send({
                        type: 'broadcast',
                        event: 'typing',
                        payload: { user_id: currentUser.id, is_typing: true }
                    });
                    lastTypingSent = now;
                }

                if (typingTimeout) clearTimeout(typingTimeout);
                typingTimeout = setTimeout(() => {
                    activeChannel.send({
                        type: 'broadcast',
                        event: 'typing',
                        payload: { user_id: currentUser.id, is_typing: false }
                    });
                    lastTypingSent = 0;
                }, 2000);
            } else {
                if (typingTimeout) clearTimeout(typingTimeout);
                activeChannel.send({
                    type: 'broadcast',
                    event: 'typing',
                    payload: { user_id: currentUser.id, is_typing: false }
                });
                lastTypingSent = 0;
            }
        },

        cleanupChat: () => {
            set({ messages: [], activeChannel: null, chatKey: null, isTyping: false });
            if (typingTimeout) clearTimeout(typingTimeout);
        }
    };
});
