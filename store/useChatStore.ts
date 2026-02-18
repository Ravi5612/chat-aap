import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';
import { getChatKey, decryptText, encryptText } from '@/utils/chatCrypto';
import { uploadChatMessageMedia } from '../utils/uploadHelper';

interface ChatState {
    messages: any[];
    loading: boolean;
    loadingMore: boolean;  // ✅ Pagination loader
    hasMore: boolean;      // ✅ Kya aur messages hain?
    pageOffset: number;    // ✅ Current page offset
    isTyping: boolean;
    flyingEmoji: any;
    chatKey: Uint8Array | null;
    activeChannel: any | null;
    activeChatId: string | null;
    cache: Record<string, { messages: any[], key: Uint8Array }>;

    // Actions
    initChat: (friendId: string, currentUser: any, isGroup: boolean) => Promise<void>;
    loadMessages: (friendId: string, currentUser: any, isGroup: boolean) => Promise<void>;
    loadMoreMessages: (friendId: string, currentUser: any, isGroup: boolean) => Promise<void>; // ✅ Pagination
    sendMessage: (text: string, friendId: string, currentUser: any, isGroup: boolean, replyToId?: string) => Promise<void>;
    reactToMessage: (messageId: string, emoji: string, currentUser: any) => Promise<void>;
    saveEdit: (messageId: string, newText: string, currentUser: any) => Promise<void>;
    deleteMessage: (messageId: string) => Promise<void>;
    forwardMessage: (messageText: string, friendIds: string[], currentUser: any) => Promise<void>;
    setTypingStatus: (typing: boolean, friendId: string, currentUser: any) => void;
    cleanupChat: () => void;
    setFlyingEmoji: (emoji: any) => void;
    markAsRead: (messageId: string, currentUser: any, friendId: string, isGroup: boolean) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => {
    let typingTimeout: any = null;
    let lastTypingSent = 0;

    return {
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

        setFlyingEmoji: (flyingEmoji) => set({ flyingEmoji }),

        initChat: async (friendId, currentUser, isGroup) => {
            if (!currentUser || !friendId) return;
            const { cache } = get();

            // Restore from cache instantly if exists
            if (cache[friendId]) {
                console.log(`ChatStore: Restoring ${friendId} from cache`);
                set({
                    messages: cache[friendId].messages,
                    chatKey: cache[friendId].key,
                    activeChatId: friendId
                });
            } else {
                set({ messages: [], chatKey: null, activeChatId: friendId });
            }

            try {
                const key = cache[friendId]?.key || await getChatKey(currentUser.id, friendId, isGroup);
                set((state) => ({
                    chatKey: key,
                    cache: { ...state.cache, [friendId]: { ...state.cache[friendId], messages: state.cache[friendId]?.messages || [], key } }
                }));
            } catch (err) {
                console.error("ChatStore: Key error:", err);
            }
        },

        loadMessages: async (friendId, currentUser, isGroup) => {
            const { chatKey, cache } = get();
            if (!friendId || !currentUser || !chatKey) return;

            const PAGE_SIZE = 50;
            const isFirstLoad = !cache[friendId] || cache[friendId].messages.length === 0;
            if (isFirstLoad) set({ loading: true });

            try {
                // ✅ Pehle total count lo
                let countQuery = supabase
                    .from('messages')
                    .select('id', { count: 'exact', head: true });

                if (isGroup) {
                    countQuery = countQuery.eq('group_id', friendId);
                } else {
                    countQuery = countQuery.or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUser.id})`);
                }

                const { count } = await countQuery;
                const totalCount = count || 0;

                // ✅ Agar koi message nahi to loading band karo
                if (totalCount === 0) {
                    set({ messages: [], loading: false, hasMore: false, pageOffset: 0 });
                    return;
                }

                // ✅ Last PAGE_SIZE messages lo (ascending order mein)
                const startOffset = Math.max(0, totalCount - PAGE_SIZE);

                let query = supabase
                    .from('messages')
                    .select(`
            *,
            sender:profiles!sender_id(id, username, avatar_url),
            reply:reply_to_id(id, message, sender_id, created_at),
            status_context:status_id(id, user_id, media_type, media_url, content)
          `);

                if (isGroup) {
                    query = query.eq('group_id', friendId);
                } else {
                    query = query.or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUser.id})`);
                }

                const { data, error } = await query
                    .order('created_at', { ascending: true })
                    .range(startOffset, totalCount - 1);

                if (error) throw error;

                const decryptedMessages = await Promise.all((data || []).map(async (msg) => {
                    try {
                        let decryptedText = msg.message;

                        // ✅ Try decrypt karo agar JSON format hai (encrypted message)
                        if (msg.message && typeof msg.message === 'string') {
                            const trimmed = msg.message.trim();
                            // JSON object = encrypted message
                            if (trimmed.startsWith('{') && trimmed.includes('"iv"') && trimmed.includes('"content"')) {
                                decryptedText = await decryptText(msg.message, chatKey);
                            }
                            // SYSTEM_MSG: plain text hai, decrypt mat karo
                            // Baaki sab plain text treat karo
                        }

                        let decryptedReply = null;
                        if (msg.reply && msg.reply.id) {
                            try {
                                const replyText = await decryptText(msg.reply.message, chatKey);
                                decryptedReply = { ...msg.reply, message: replyText };
                            } catch (e) {
                                decryptedReply = { ...msg.reply, message: msg.reply.message };
                            }
                        }
                        return { ...msg, message: decryptedText, reply: decryptedReply };
                    } catch (e) {
                        return { ...msg }; // ✅ Original message as-is
                    }
                }));

                const activeChatId = get().activeChatId;
                if (activeChatId === friendId) {
                    set({
                        messages: decryptedMessages,
                        loading: false,
                        pageOffset: startOffset,
                        hasMore: startOffset > 0,
                    });
                }

                // Update cache
                set((state) => ({
                    cache: { ...state.cache, [friendId]: { messages: decryptedMessages, key: chatKey } }
                }));

                // Mark as read
                const unreadIds = (data || [])
                    .filter(m => (isGroup ? m.sender_id !== currentUser.id : m.sender_id === friendId) && !m.is_read)
                    .map(m => m.id);

                if (unreadIds.length > 0) {
                    await supabase.from('messages').update({ is_read: true, status: 'read' }).in('id', unreadIds);

                    // ✅ Real-time Broadcast: Blue Tick update
                    const { activeChannel } = get();
                    if (activeChannel) {
                        activeChannel.send({
                            type: 'broadcast',
                            event: 'status_update',
                            payload: {
                                status: 'read',
                                sender_id: currentUser.id,
                                group_id: isGroup ? friendId : null
                            }
                        });
                    }
                }
            } catch (error: any) {
                console.error('ChatStore: Load error:', error.message);
                set({ loading: false });
            }
        },

        // ✅ PAGINATION - Jab user upar scroll kare to purane messages load karo
        loadMoreMessages: async (friendId, currentUser, isGroup) => {
            const { chatKey, messages, pageOffset, hasMore, loadingMore } = get();
            if (!friendId || !currentUser || !chatKey || !hasMore || loadingMore) return;

            const PAGE_SIZE = 50;
            set({ loadingMore: true });

            try {
                // ✅ pageOffset se pehle ke messages lo (ascending order)
                const endOffset = Math.max(0, pageOffset - 1);
                const startOffset = Math.max(0, pageOffset - PAGE_SIZE);

                if (endOffset < 0) {
                    set({ loadingMore: false, hasMore: false });
                    return;
                }

                let query = supabase
                    .from('messages')
                    .select(`
            *,
            sender:profiles!sender_id(id, username, avatar_url),
            reply:reply_to_id(id, message, sender_id, created_at),
            status_context:status_id(id, user_id, media_type, media_url, content)
          `);

                if (isGroup) {
                    query = query.eq('group_id', friendId);
                } else {
                    query = query.or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUser.id})`);
                }

                const { data, error } = await query
                    .order('created_at', { ascending: true })
                    .range(startOffset, endOffset);

                if (error) throw error;

                const decryptedOlderMessages = await Promise.all((data || []).map(async (msg) => {
                    try {
                        let decryptedText = msg.message;
                        if (msg.message && typeof msg.message === 'string') {
                            const trimmed = msg.message.trim();
                            if (trimmed.startsWith('{') && trimmed.includes('"iv"') && trimmed.includes('"content"')) {
                                decryptedText = await decryptText(msg.message, chatKey);
                            }
                        }
                        let decryptedReply = null;
                        if (msg.reply && msg.reply.id) {
                            try {
                                const replyText = await decryptText(msg.reply.message, chatKey);
                                decryptedReply = { ...msg.reply, message: replyText };
                            } catch (e) {
                                decryptedReply = { ...msg.reply, message: msg.reply.message };
                            }
                        }
                        return { ...msg, message: decryptedText, reply: decryptedReply };
                    } catch (e) {
                        return { ...msg }; // ✅ Original message as-is
                    }
                }));

                // ✅ Purane messages pehle, naye baad mein
                const combinedMessages = [...decryptedOlderMessages, ...messages];

                set({
                    messages: combinedMessages,
                    loadingMore: false,
                    pageOffset: startOffset,
                    hasMore: startOffset > 0,
                });

                // Update cache
                set((state) => ({
                    cache: { ...state.cache, [friendId]: { messages: combinedMessages, key: chatKey } }
                }));

            } catch (error: any) {
                console.error('ChatStore: LoadMore error:', error.message);
                set({ loadingMore: false });
            }
        },

        sendMessage: async (text, friendId, currentUser, isGroup, replyToId) => {
            const { chatKey, activeChannel, messages, cache } = get();
            if ((!text || !text.trim()) && !text.startsWith('[Voice Message]') && !text.startsWith('[Image]') && !friendId || !currentUser || !chatKey) return;

            // 🛡️ Security Check: Verify Group Membership
            // 🛡️ Security Check: Verify Group Membership
            if (isGroup) {
                console.log(`Checking membership for Group: ${friendId}, User: ${currentUser.id}`);
                const { data: memberCheck, error: memberError } = await supabase
                    .from('group_members')
                    .select('id')
                    .eq('group_id', friendId)
                    .eq('user_id', currentUser.id);

                if (memberError) {
                    console.error("Membership Check Error:", memberError);
                    Alert.alert('Error', 'Failed to verify group membership.');
                    return;
                }

                if (!memberCheck || memberCheck.length === 0) {
                    console.warn(`Access Denied: User ${currentUser.id} is NOT a member of group ${friendId}`);
                    Alert.alert('Access Denied', 'You are no longer a participant of this group.');
                    return;
                }
                console.log("Membership verified ✅. Data:", memberCheck);
            }

            const tempId = `temp-${Date.now()}`;
            let messageToEncrypt = text;
            let fileData: any = null;

            const tempMsg: any = {
                id: tempId,
                message: text.startsWith('[Voice Message]') || text.startsWith('[Image]') ? '' : text,
                sender_id: currentUser.id,
                receiver_id: isGroup ? null : friendId,
                group_id: isGroup ? friendId : null,
                status: 'sending',
                reply_to_id: replyToId,
                created_at: new Date().toISOString(),
                file_url: text.startsWith('[Voice Message]') ? text.split(' ')[2] : (text.startsWith('[Image]') ? text.split(' ')[1] : null),
                file_type: text.startsWith('[Voice Message]') ? 'audio/m4a' : (text.startsWith('[Image]') ? 'image/jpeg' : null)
            };

            const updatedMessages = [...messages, tempMsg];
            set({ messages: updatedMessages });
            set((state) => ({
                cache: { ...state.cache, [friendId]: { ...state.cache[friendId], messages: updatedMessages, key: chatKey } }
            }));

            try {
                if (text.startsWith('[Voice Message]') || text.startsWith('[Image]')) {
                    const isVoice = text.startsWith('[Voice Message]');
                    const localUri = isVoice ? text.split(' ')[2] : text.split(' ')[1];
                    if (localUri && (localUri.startsWith('file://') || localUri.startsWith('content://'))) {
                        fileData = await uploadChatMessageMedia(localUri, isVoice ? 'voice' : 'image', currentUser.id);
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

                const finalMsg = { ...data, message: messageToEncrypt };
                set((state) => {
                    const newMessages = state.messages.map(m => m.id === tempId ? finalMsg : m);
                    return {
                        messages: newMessages,
                        cache: { ...state.cache, [friendId]: { ...state.cache[friendId], messages: newMessages, key: chatKey } }
                    };
                });

                if (activeChannel) {
                    activeChannel.send({
                        type: 'broadcast',
                        event: 'new_message',
                        payload: finalMsg
                    });
                }
            } catch (error: any) {
                console.error("SendMessage Error:", error);
                set((state) => ({
                    messages: state.messages.filter(m => m.id !== tempId),
                    cache: { ...state.cache, [friendId]: { ...state.cache[friendId], messages: state.messages.filter(m => m.id !== tempId), key: chatKey } }
                }));
                Alert.alert('Error', 'Failed to send message');
            }
        },

        reactToMessage: async (messageId, emoji, currentUser) => {
            const { messages, activeChannel, activeChatId, cache, chatKey } = get();
            if (!currentUser || !activeChatId) return;
            try {
                const reactions = { ...(messages.find(m => m.id === messageId)?.reactions || {}) };
                reactions[emoji] = (reactions[emoji] || 0) + 1;

                const { error } = await supabase.from('messages').update({ reactions }).eq('id', messageId);
                if (error) throw error;

                const newMessages = messages.map(m => m.id === messageId ? { ...m, reactions } : m);
                set({ messages: newMessages });
                set((state) => ({
                    cache: { ...state.cache, [activeChatId]: { ...state.cache[activeChatId], messages: newMessages, key: chatKey! } }
                }));

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
            const { chatKey, activeChannel, messages, activeChatId } = get();
            if (!chatKey || !currentUser || !activeChatId) return;
            try {
                const encryptedText = await encryptText(newText, chatKey);
                const { error } = await supabase.from('messages').update({
                    message: encryptedText,
                    is_edited: true,
                    edited_at: new Date().toISOString()
                }).eq('id', messageId);

                if (error) throw error;

                const newMessages = messages.map(m => m.id === messageId ? { ...m, message: newText, is_edited: true } : m);
                set({ messages: newMessages });
                set((state) => ({
                    cache: { ...state.cache, [activeChatId]: { ...state.cache[activeChatId], messages: newMessages, key: chatKey! } }
                }));

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
            const { messages, activeChannel, activeChatId, chatKey } = get();
            if (!activeChatId) return;
            try {
                const { error } = await supabase.from('messages').delete().eq('id', messageId);
                if (error) throw error;

                const newMessages = messages.filter(m => m.id !== messageId);
                set({ messages: newMessages });
                set((state) => ({
                    cache: { ...state.cache, [activeChatId]: { ...state.cache[activeChatId], messages: newMessages, key: chatKey! } }
                }));

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

        markAsRead: async (messageId, currentUser, friendId, isGroup) => {
            const { activeChannel } = get();
            try {
                await supabase.from('messages').update({ is_read: true, status: 'read' }).eq('id', messageId);

                if (activeChannel) {
                    activeChannel.send({
                        type: 'broadcast',
                        event: 'status_update',
                        payload: {
                            status: 'read',
                            sender_id: currentUser.id,
                            group_id: isGroup ? friendId : null,
                            message_id: messageId
                        }
                    });
                }
            } catch (err) {
                console.error("markAsRead error:", err);
            }
        },

        cleanupChat: () => {
            // Only clear active state, keep messages/key in cache
            set({ activeChannel: null, activeChatId: null, isTyping: false, pageOffset: 0, hasMore: true, loadingMore: false });
            if (typingTimeout) clearTimeout(typingTimeout);
        }
    };
});
