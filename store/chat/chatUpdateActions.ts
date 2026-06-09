import { markMessageAsDeletedLocally } from '@/lib/localDb';
import { supabase } from '@/lib/supabase';
import { encryptText } from '@/utils/chatCrypto';
import { Alert } from 'react-native';
import { useDbStore } from '../useDbStore';
import { StoreGet, StoreSet } from './chatTypes';

let typingTimeout: any = null;
let lastTypingSent = 0;

let markAsReadQueue: string[] = [];
let markAsReadTimer: any = null;
let markAsReadMeta: { currentUser: any; friendId: string; isGroup: boolean; channel: any } | null = null;

const flushMarkAsRead = async (get: StoreGet) => {
    if (markAsReadQueue.length === 0) return;
    const ids = [...markAsReadQueue];
    markAsReadQueue = [];
    const meta = markAsReadMeta;
    if (!meta) return;

    try {
        const now = new Date().toISOString();
        await supabase.from('messages').update({ is_read: true, status: 'read', read_at: now }).in('id', ids);
        
        if (meta.channel) {
            meta.channel.send({
                type: 'broadcast',
                event: 'status_update',
                payload: { 
                    status: 'read', 
                    message_ids: ids, 
                    user_id: meta.currentUser.id, 
                    group_id: meta.isGroup ? meta.friendId : null 
                }
            });
        }
    } catch (err) {
        console.error('flushMarkAsRead error:', err);
    }
};

export const createChatUpdateActions = (set: StoreSet, get: StoreGet) => ({
    reactToMessage: async (messageId: string, emoji: string, currentUser: any) => {
        const { messages, activeChannel, activeChatId, cache, chatKey } = get();
        if (!currentUser || !activeChatId) return;
        try {
            const reactions = { ...(messages.find(m => m.id === messageId)?.reactions || {}) };
            reactions[emoji] = (reactions[emoji] || 0) + 1;

            const { error } = await supabase.from('messages').update({ reactions }).eq('id', messageId);
            if (error) throw error;

            const newMessages = messages.map(m => m.id === messageId ? { ...m, reactions } : m);
            set((state: any) => ({
                messages: newMessages,
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

    saveEdit: async (messageId: string, newText: string, currentUser: any) => {
        const { chatKey, activeChannel, messages, activeChatId } = get();
        if (!chatKey || !currentUser || !activeChatId) return;
        try {
            const encryptedText = await encryptText(newText, chatKey);
            const { error } = await supabase.from('messages').update({
                message: encryptedText
            }).eq('id', messageId);

            if (error) throw error;

            const newMessages = messages.map(m => m.id === messageId ? { ...m, message: newText, is_edited: true } : m);
            set((state: any) => ({
                messages: newMessages,
                cache: { ...state.cache, [activeChatId]: { ...state.cache[activeChatId], messages: newMessages, key: chatKey! } }
            }));

            // broadcast removed to save data
        } catch (err) {
            Alert.alert('Error', 'Failed to update message');
        }
    },

    deleteMessage: async (messageId: string, forEveryone: boolean) => {
        const { messages, activeChannel, activeChatId, chatKey } = get();
        if (!activeChatId || !chatKey) return;
        try {
            const { db } = useDbStore.getState();

            if (forEveryone) {
                // 1. Update on Server (Replace content)
                const encryptedDeletedText = await encryptText('SYSTEM_MSG: DELETED', chatKey);
                const { error } = await supabase.from('messages').update({
                    message: encryptedDeletedText,
                    file_url: null,
                    file_name: null,
                    file_type: null
                }).eq('id', messageId);

                if (error) throw error;

                // 2. Update Local UI
                const newMessages = messages.map(m => m.id === messageId ? { ...m, message: 'SYSTEM_MSG: DELETED', file_url: null } : m);
                set({ messages: newMessages });

                // 3. Broadcast Edit
                // broadcast removed to save data
            } else {
                // Delete for Me
                if (db) {
                    await markMessageAsDeletedLocally(db, messageId);
                }
                const newMessages = messages.filter(m => m && m.id && m.id !== messageId);
                set({ messages: newMessages });
            }

            // Update Cache Safely
            const finalMessages = get().messages;
            set((state: any) => ({
                cache: {
                    ...state.cache,
                    [activeChatId]: {
                        ...state.cache[activeChatId],
                        messages: finalMessages,
                        key: chatKey
                    }
                }
            }));
        } catch (err: any) {
            console.error("Delete error:", err);
            Alert.alert('Error', `Failed to delete message: ${err.message || err.details || 'Unknown error'}`);
        }
    },

    setTypingStatus: (typing: boolean, friendId: string, currentUser: any) => {
        const { activeChannel } = get();
        const { globalChannel } = (require('../useFriendsStore').useFriendsStore.getState());

        const sendPresenceUpdate = (isTyping: boolean) => {
            if (globalChannel) {
                globalChannel.track({
                    userId: currentUser.id,
                    online_at: new Date().toISOString(),
                    typingTo: isTyping ? friendId : null
                });
            }
        };

        if (typing) {
            const now = Date.now();
            if (now - lastTypingSent > 3000) {
                sendPresenceUpdate(true);
                if (activeChannel) {
                    activeChannel.send({
                        type: 'broadcast',
                        event: 'typing',
                        payload: { user_id: currentUser.id, is_typing: true }
                    });
                }
                lastTypingSent = now;
            }

            if (typingTimeout) clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                sendPresenceUpdate(false);
                if (activeChannel) {
                    activeChannel.send({
                        type: 'broadcast',
                        event: 'typing',
                        payload: { user_id: currentUser.id, is_typing: false }
                    });
                }
                lastTypingSent = 0;
            }, 3000); // Wait 3 seconds of inactivity to stop typing
        } else {
            if (typingTimeout) clearTimeout(typingTimeout);
            sendPresenceUpdate(false);
            if (activeChannel) {
                activeChannel.send({
                    type: 'broadcast',
                    event: 'typing',
                    payload: { user_id: currentUser.id, is_typing: false }
                });
            }
            lastTypingSent = 0;
        }
    },

    markAsRead: async (messageId: string, currentUser: any, friendId: string, isGroup: boolean) => {
        markAsReadQueue.push(messageId);
        markAsReadMeta = { currentUser, friendId, isGroup, channel: get().activeChannel };

        if (markAsReadTimer) clearTimeout(markAsReadTimer);
        markAsReadTimer = setTimeout(() => {
            markAsReadTimer = null;
            flushMarkAsRead(get);
        }, 300);
    },

    cleanupChat: () => {
        set({ activeChannel: null, activeChatId: null, isTyping: false, pageOffset: 0, hasMore: true, loadingMore: false });
        if (typingTimeout) clearTimeout(typingTimeout);
    }
});
