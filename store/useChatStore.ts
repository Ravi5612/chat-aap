import { create } from 'zustand';
import { uploadChatMessageMediaWithProgress } from '../utils/uploadHelper';
import { useDbStore } from './useDbStore';
import { decryptText, encryptText, getChatKey } from '@/utils/chatCrypto';
import { saveToCache, getFromCache } from '@/lib/database';
import { logErrorToDB } from '@/utils/errorLogger';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';
import { 
    getLocalMessages, 
    saveLocalMessage, 
    getChatClearTimestamp, 
    getLocallyDeletedMessages, 
    syncLedgerExpense, 
    markMessageAsDeletedLocally 
} from '@/lib/localDb';

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
    uploadProgress: Record<string, number>; // ✅ tempId -> 0-100 percent

    // Actions
    initChat: (friendId: string, currentUser: any, isGroup: boolean) => Promise<void>;
    loadMessages: (friendId: string, currentUser: any, isGroup: boolean) => Promise<void>;
    loadMoreMessages: (friendId: string, currentUser: any, isGroup: boolean) => Promise<void>;
    sendMessage: (text: string, friendId: string, currentUser: any, isGroup: boolean, replyToId?: string, messageType?: string, disappearingDuration?: number, scheduledAt?: Date) => Promise<void>;
    reactToMessage: (messageId: string, emoji: string, currentUser: any) => Promise<void>;
    saveEdit: (messageId: string, newText: string, currentUser: any) => Promise<void>;
    deleteMessage: (messageId: string, forEveryone: boolean) => Promise<void>;
    forwardMessage: (messageText: string, friendIds: string[], currentUser: any) => Promise<void>;
    setTypingStatus: (typing: boolean, friendId: string, currentUser: any) => void;
    cleanupChat: () => void;
    setFlyingEmoji: (emoji: any) => void;
    markAsRead: (messageId: string, currentUser: any, friendId: string, isGroup: boolean) => Promise<void>;
    loadMessagesUpToId: (friendId: string, currentUser: any, isGroup: boolean, targetMsgId: string, targetCreatedAt: string) => Promise<boolean>;
}

export const useChatStore = create<ChatState>((set, get) => {
    let typingTimeout: any = null;
    let lastTypingSent = 0;

    // ✅ Batched markAsRead: collect message IDs and flush together
    let markAsReadQueue: string[] = [];
    let markAsReadTimer: any = null;
    let markAsReadMeta: { currentUser: any; friendId: string; isGroup: boolean; channel: any } | null = null;

    const flushMarkAsRead = async () => {
        if (markAsReadQueue.length === 0) return;
        const ids = [...markAsReadQueue];
        markAsReadQueue = [];
        const meta = markAsReadMeta;
        if (!meta) return;

        try {
            await supabase.from('messages').update({ is_read: true, status: 'read' }).in('id', ids);
            const { activeChannel } = get();
            if (activeChannel) {
                activeChannel.send({
                    type: 'broadcast',
                    event: 'status_update',
                    payload: {
                        status: 'read',
                        sender_id: meta.currentUser?.id,
                        group_id: meta.isGroup ? meta.friendId : null,
                    }
                });
            }
        } catch (err) {
            console.error('flushMarkAsRead error:', err);
        }
    };

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
        uploadProgress: {}, // ✅ empty map initially

        setFlyingEmoji: (flyingEmoji) => set({ flyingEmoji }),

        initChat: async (friendId, currentUser, isGroup) => {
            if (!currentUser || !friendId) return;
            const { cache } = get();

            // 0. Load instantly from SQLite if available
            const sqliteCache = getFromCache(`chat_messages_${friendId}`);

            // Restore from cache instantly if exists
            if (cache[friendId]) {
                console.log(`ChatStore: Restoring ${friendId} from cache`);
                set({
                    messages: cache[friendId].messages,
                    chatKey: cache[friendId].key,
                    activeChatId: friendId
                });
            } else if (sqliteCache && sqliteCache.messages) {
                console.log(`ChatStore: Restoring ${friendId} from SQLite`);
                set({
                    messages: sqliteCache.messages,
                    chatKey: null,
                    activeChatId: friendId
                });
            } else {
                set({ messages: [], chatKey: null, activeChatId: friendId });
            }

            try {
                const key = cache[friendId]?.key || await getChatKey(currentUser.id, friendId, isGroup);
                set((state) => ({
                    chatKey: key,
                    cache: { ...state.cache, [friendId]: { ...state.cache[friendId], messages: state.cache[friendId]?.messages || sqliteCache?.messages || [], key } }
                }));
            } catch (err) {
                console.error("ChatStore: Key error:", err);
            }
        },

        loadMessages: async (friendId, currentUser, isGroup) => {
            const { chatKey, cache, messages } = get();
            if (!friendId || !currentUser || !chatKey) return;

            const PAGE_SIZE = 20;
            let hasLocalMessages = false;

            // 1. Try loading from Local DB first for instant UI (Last 20)
            try {
                const { db } = useDbStore.getState();
                if (db && friendId) {
                    const clearTimestamp = await getChatClearTimestamp(db, friendId);
                    const localDeletedIds = await getLocallyDeletedMessages(db);
                    // Fetch last 20 from local DB
                    let localMsgs = await getLocalMessages(db, friendId, isGroup, PAGE_SIZE, 0);

                    // Since localMsgs are DESC from DB, reverse them for ASC store
                    localMsgs = localMsgs.reverse();

                    if (clearTimestamp) {
                        localMsgs = localMsgs.filter(m => m && m.created_at && new Date(m.created_at) > new Date(clearTimestamp));
                    }

                    if (localDeletedIds && localDeletedIds.length > 0) {
                        localMsgs = localMsgs.filter(m => m && m.id && !localDeletedIds.includes(m.id));
                    }

                    if (localMsgs && localMsgs.length > 0) {
                        hasLocalMessages = true;
                        console.log(`ChatStore: Loaded ${localMsgs.length} messages from Local DB (Paginated)`);
                        set({
                            messages: localMsgs,
                            loading: false,
                            hasMore: localMsgs.length >= PAGE_SIZE, // Assume there's more if we got a full page
                            cache: { ...get().cache, [friendId]: { messages: localMsgs, key: chatKey } }
                        });
                    }
                }
            } catch (dbErr) {
                console.warn('[DB] Local load failed, falling back to network:', dbErr);
            }

            const isFirstLoad = !cache[friendId] || cache[friendId].messages.length === 0;
            // Only show skeleton loader if we have NO messages from anywhere (neither memory nor SQLite)
            if (isFirstLoad && get().messages.length === 0 && !hasLocalMessages) {
                set({ loading: true });
            }

            try {
                const { db } = useDbStore.getState();
                const clearTimestamp = db ? await getChatClearTimestamp(db, friendId) : null;

                let query = supabase
                    .from('messages')
                    .select(`
            *,
            sender:profiles!sender_id(id, username, avatar_url),
            reply:reply_to_id(id, message, sender_id, created_at),
            status_context:status_id(id, user_id, media_type, media_url, content, encrypted_keys)
          `);

                if (isGroup) {
                    query = query.eq('group_id', friendId);
                } else {
                    query = query.or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUser.id})`);
                }

                if (clearTimestamp) {
                    query = query.gt('created_at', clearTimestamp);
                }

                const { data: rawData, error } = await query
                    .order('created_at', { ascending: false })
                    .limit(PAGE_SIZE);

                if (error) throw error;
                
                const data = (rawData || []).reverse();



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
                        let decryptedFileUrl = msg.file_url;
                        if (msg.file_url && msg.file_url.trim().startsWith('{')) {
                            try {
                                decryptedFileUrl = await decryptText(msg.file_url, chatKey);
                            } catch (e) {
                                decryptedFileUrl = msg.file_url;
                            }
                        }

                        return { ...msg, message: decryptedText, reply: decryptedReply, file_url: decryptedFileUrl };
                    } catch (e) {
                        return { ...msg }; // ✅ Original message as-is
                    }
                }));

                let finalMessages = decryptedMessages.filter(m => !m.expires_at || new Date(m.expires_at).getTime() > Date.now());
                try {
                    const { db } = useDbStore.getState();
                    const localDeletedIds = db ? await getLocallyDeletedMessages(db) : [];
                    if (localDeletedIds && localDeletedIds.length > 0) {
                        finalMessages = finalMessages.filter(m => m && m.id && !localDeletedIds.includes(m.id));
                    }
                } catch (e) {
                    console.warn('[ChatStore] Local filter failed:', e);
                }

                const activeChatId = get().activeChatId;
                if (activeChatId === friendId) {
                    // Deduplicate by ID, preserving temp messages
                    const pendingMsgs = get().messages.filter(m => String(m.id).startsWith('temp-'));
                    const combined = [...pendingMsgs, ...finalMessages];
                    const uniqueMessages = Array.from(new Map(combined.map(m => [m.id, m])).values());
                    
                    // Sort by created_at DESC so temp messages stay at bottom (index 0 usually, or keep original sort logic)
                    uniqueMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                    set({
                        messages: uniqueMessages,
                        loading: false,
                        hasMore: data.length === PAGE_SIZE,
                    });

                    // 2. Save fetched messages to Local DB for next time
                    const { db } = useDbStore.getState();
                    if (db) {
                        // ✅ require() moved outside forEach to avoid repeated module lookups
                        const { useAuthStore } = require('./useAuthStore');
                        const currentUserId = useAuthStore.getState().user?.id;
                        finalMessages.forEach(msg => {
                            saveLocalMessage(db, msg);
                            if (currentUserId) syncLedgerExpense(db, msg, currentUserId);
                        });
                    }
                }

                // Update cache with deduplicated messages
                const uniqueMessagesArray = Array.from(new Map(finalMessages.map(m => [m.id, m])).values());
                set((state) => ({
                    cache: { ...state.cache, [friendId]: { messages: uniqueMessagesArray, key: chatKey } }
                }));

                // ✅ Save to SQLite Cache
                saveToCache(`chat_messages_${friendId}`, { messages: uniqueMessagesArray });

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
                logErrorToDB(error, 'ChatStore: Load Messages', currentUser.id, currentUser.username);
            }
        },

        // ✅ PAGINATION - Jab user upar scroll kare to purane messages load karo
        loadMoreMessages: async (friendId, currentUser, isGroup) => {
            const { chatKey, messages, pageOffset, hasMore, loadingMore } = get();
            if (!friendId || !currentUser || !chatKey || !hasMore || loadingMore) return;

            const PAGE_SIZE = 20;
            set({ loadingMore: true });

            try {
                // 1. Try Local DB first for older messages
                const { db } = useDbStore.getState();
                const currentLocalCount = messages.length;
                let olderLocalMsgs: any[] = [];

                if (db) {
                    // Fetch next 20 from local DB
                    olderLocalMsgs = await getLocalMessages(db, friendId, isGroup, PAGE_SIZE, currentLocalCount);
                    olderLocalMsgs = olderLocalMsgs.reverse(); // Make them ASC
                }

                if (olderLocalMsgs.length > 0) {
                    console.log(`ChatStore: Loaded ${olderLocalMsgs.length} older messages from Local DB`);
                    const combined = [...olderLocalMsgs, ...messages];
                    const unique = Array.from(new Map(combined.map(m => [m.id, m])).values());

                    set({
                        messages: unique,
                        loadingMore: false,
                        hasMore: true, // We found some locally, might be more
                    });
                    return;
                }

                // 2. If not in local DB, fetch from Supabase
                const oldestMsg = messages[0];
                if (!oldestMsg || !oldestMsg.created_at) {
                    set({ loadingMore: false, hasMore: false });
                    return;
                }

                const clearTimestamp = db ? await getChatClearTimestamp(db, friendId) : null;

                let query = supabase
                    .from('messages')
                    .select(`
            *,
            sender:profiles!sender_id(id, username, avatar_url),
            reply:reply_to_id(id, message, sender_id, created_at),
            status_context:status_id(id, user_id, media_type, media_url, content, encrypted_keys)
          `);

                if (isGroup) {
                    query = query.eq('group_id', friendId);
                } else {
                    query = query.or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUser.id})`);
                }

                if (clearTimestamp) {
                    query = query.gt('created_at', clearTimestamp);
                }

                const { data: rawData, error } = await query
                    .lt('created_at', oldestMsg.created_at)
                    .order('created_at', { ascending: false })
                    .limit(PAGE_SIZE);

                if (error) throw error;
                const data = (rawData || []).reverse();

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
                        let decryptedFileUrl = msg.file_url;
                        if (msg.file_url && msg.file_url.trim().startsWith('{')) {
                            try {
                                decryptedFileUrl = await decryptText(msg.file_url, chatKey);
                            } catch (e) {
                                decryptedFileUrl = msg.file_url;
                            }
                        }

                        return { ...msg, message: decryptedText, reply: decryptedReply, file_url: decryptedFileUrl };
                    } catch (e) {
                        return { ...msg }; // ✅ Original message as-is
                    }
                }));

                let filteredOlderMessages = decryptedOlderMessages.filter(m => !m.expires_at || new Date(m.expires_at).getTime() > Date.now());
                try {
                    const { db } = useDbStore.getState();
                    const localDeletedIds = db ? await getLocallyDeletedMessages(db) : [];
                    if (localDeletedIds && localDeletedIds.length > 0) {
                        filteredOlderMessages = filteredOlderMessages.filter(m => m && m.id && !localDeletedIds.includes(m.id));
                    }
                } catch (e) {
                    console.warn('[ChatStore] LoadMore filter failed:', e);
                }

                // ✅ Purane messages pehle, naye baad mein - Deduplicate by ID
                const pendingMsgs = get().messages.filter(m => String(m.id).startsWith('temp-'));
                const combinedMessages = [...pendingMsgs, ...filteredOlderMessages, ...messages].filter(m => m && m.id);
                const uniqueMessages = Array.from(new Map(combinedMessages.map(m => [m.id, m])).values());
                uniqueMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                // ✅ Single atomic set() — merged messages + cache update
                set((state) => ({
                    messages: uniqueMessages,
                    loadingMore: false,
                    hasMore: data.length === PAGE_SIZE,
                    cache: { ...state.cache, [friendId]: { messages: uniqueMessages, key: chatKey } }
                }));

                // ✅ Save to SQLite Cache
                saveToCache(`chat_messages_${friendId}`, { messages: uniqueMessages });

            } catch (error: any) {
                console.error('ChatStore: LoadMore error:', error.message);
                set({ loadingMore: false });
                logErrorToDB(error, 'ChatStore: Load More Messages', currentUser.id, currentUser.username);
            }
        },

        loadMessagesUpToId: async (friendId, currentUser, isGroup, targetMsgId, targetCreatedAt) => {
            const { chatKey, messages } = get();
            if (!friendId || !currentUser || !chatKey || !targetMsgId || !targetCreatedAt) return false;

            try {
                // 1. Try loading from SQLite DB
                const { db } = useDbStore.getState();
                if (db) {
                    const clearTimestamp = await getChatClearTimestamp(db, friendId);
                    const localDeletedIds = await getLocallyDeletedMessages(db);

                    const query = isGroup 
                        ? 'SELECT * FROM messages WHERE group_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 150'
                        : 'SELECT * FROM messages WHERE (sender_id = ? OR receiver_id = ?) AND group_id IS NULL AND created_at >= ? ORDER BY created_at DESC LIMIT 150';
                    
                    const params = isGroup 
                        ? [friendId, targetCreatedAt] 
                        : [friendId, friendId, targetCreatedAt];

                    const results = await db.getAllAsync<any>(query, params);
                    let fetchedMsgs = results.map(row => ({
                        ...row,
                        is_read: row.is_read === 1,
                        reactions: JSON.parse(row.reactions || '{}')
                    }));

                    fetchedMsgs = fetchedMsgs.reverse();

                    if (clearTimestamp) {
                        fetchedMsgs = fetchedMsgs.filter(m => m && m.created_at && new Date(m.created_at) > new Date(clearTimestamp));
                    }

                    if (localDeletedIds && localDeletedIds.length > 0) {
                        fetchedMsgs = fetchedMsgs.filter(m => m && m.id && !localDeletedIds.includes(m.id));
                    }

                    const hasTarget = fetchedMsgs.some(m => m.id === targetMsgId);
                    if (hasTarget && fetchedMsgs.length > 0) {
                        console.log(`[Store] loadMessagesUpToId: Found target message in SQLite. Loaded ${fetchedMsgs.length} messages.`);
                        const combined = [...fetchedMsgs, ...messages];
                        const unique = Array.from(new Map(combined.map(m => [m.id, m])).values());
                        unique.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                        set({
                            messages: unique,
                            cache: { ...get().cache, [friendId]: { messages: unique, key: chatKey } }
                        });
                        saveToCache(`chat_messages_${friendId}`, { messages: unique });
                        return true;
                    }
                }
            } catch (dbErr) {
                console.warn('[DB] loadMessagesUpToId local load failed:', dbErr);
            }

            // 2. Fallback to Supabase if not found in SQLite
            try {
                console.log(`[Store] loadMessagesUpToId: Target not in SQLite. Fetching from Supabase starting from ${targetCreatedAt}`);
                let query = supabase
                    .from('messages')
                    .select(`
                        *,
                        sender:profiles!sender_id(id, username, avatar_url),
                        reply:reply_to_id(id, message, sender_id, created_at),
                        status_context:status_id(id, user_id, media_type, media_url, content, encrypted_keys)
                    `);

                if (isGroup) {
                    query = query.eq('group_id', friendId);
                } else {
                    query = query.or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUser.id})`);
                }

                query = query.gte('created_at', targetCreatedAt);

                const { data, error } = await query.order('created_at', { ascending: true }).limit(100);
                if (error) throw error;

                if (data && data.length > 0) {
                    const decryptedMessages = await Promise.all((data || []).map(async (msg) => {
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
                            let decryptedFileUrl = msg.file_url;
                            if (msg.file_url && msg.file_url.trim().startsWith('{')) {
                                try {
                                    decryptedFileUrl = await decryptText(msg.file_url, chatKey);
                                } catch (e) {
                                    decryptedFileUrl = msg.file_url;
                                }
                            }
                            return { ...msg, message: decryptedText, reply: decryptedReply, file_url: decryptedFileUrl };
                        } catch (e) {
                            return { ...msg };
                        }
                    }));

                    let filtered = decryptedMessages.filter(m => !m.expires_at || new Date(m.expires_at).getTime() > Date.now());
                    try {
                        const { db } = useDbStore.getState();
                        const localDeletedIds = db ? await getLocallyDeletedMessages(db) : [];
                        if (localDeletedIds && localDeletedIds.length > 0) {
                            filtered = filtered.filter(m => m && m.id && !localDeletedIds.includes(m.id));
                        }
                    } catch (e) {
                        console.warn('[ChatStore] loadMessagesUpToId filter failed:', e);
                    }

                    const combined = [...filtered, ...messages];
                    const unique = Array.from(new Map(combined.map(m => [m.id, m])).values());
                    unique.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                    set({
                        messages: unique,
                        cache: { ...get().cache, [friendId]: { messages: unique, key: chatKey } }
                    });
                    saveToCache(`chat_messages_${friendId}`, { messages: unique });
                    return true;
                }
            } catch (err: any) {
                console.error('ChatStore: loadMessagesUpToId supabase fallback error:', err.message);
                logErrorToDB(err, 'ChatStore: loadMessagesUpToId Fallback', currentUser.id, currentUser.username);
            }

            return false;
        },

        sendMessage: async (text, friendId, currentUser, isGroup, replyToId, messageType, disappearingDuration, scheduledAt) => {
            const { chatKey, activeChannel, messages, cache } = get();
            if ((!text || !text.trim()) && !text.startsWith('[Voice Message]') && !text.startsWith('[Image]') && !text.startsWith('[Video]') && !text.startsWith('[Document]')) return;
            if (!friendId || !currentUser) return;
            if (!chatKey) {
                Alert.alert(
                    "Encryption Key Missing",
                    "Cannot send message. The other user has not set up End-to-End Encryption yet (they need to log in to the new app once to generate their keys)."
                );
                return;
            }

            // Note: Group membership check is now handled locally in useChatRoom before calling this to save a DB trip.

            const tempId = `temp-${Date.now()}`;
            let messageToEncrypt = text;
            let fileData: any = null;

            // ✅ Find the replied message from local state so the sender can see it instantly
            const replyMsgObj = replyToId ? messages.find(m => m.id === replyToId) : null;
            const replyObject = replyMsgObj ? {
                id: replyMsgObj.id,
                message: replyMsgObj.message,
                sender_id: replyMsgObj.sender_id,
                created_at: replyMsgObj.created_at
            } : null;

            const tempMsg: any = {
                id: tempId,
                message: text.startsWith('[Voice Message]') || text.startsWith('[Image]') || text.startsWith('[Video]') || text.startsWith('[Document]') ? '' : text,
                sender_id: currentUser.id,
                receiver_id: isGroup ? null : friendId,
                group_id: isGroup ? friendId : null,
                status: 'pending',
                reply_to_id: replyToId,
                reply: replyObject,
                message_type: messageType || 'text',
                created_at: new Date().toISOString(),
                file_url: text.startsWith('[Voice Message]') ? text.split(' ')[2] : (text.startsWith('[Image]') || text.startsWith('[Video]') ? text.split(' ')[1] : (text.startsWith('[Document]') ? text.split(' | ')[0].replace('[Document] ', '').trim() : null)),
                file_type: text.startsWith('[Voice Message]') ? 'audio/m4a' : (text.startsWith('[Image]') ? 'image/jpeg' : (text.startsWith('[Video]') ? 'video/mp4' : (text.startsWith('[Document]') ? text.split(' | ')[2].trim() : null))),
                file_name: text.startsWith('[Document]') ? text.split(' | ')[1].trim() : null
            };

            const updatedMessages = scheduledAt ? messages : [...messages, tempMsg];
            if (!scheduledAt) {
                set((state) => ({
                    messages: updatedMessages,
                    cache: { ...state.cache, [friendId]: { ...state.cache[friendId], messages: updatedMessages, key: chatKey } }
                }));
            }

            // ✅ Save to Local SQLite DB immediately!
            const { db } = useDbStore.getState();
            if (db && !scheduledAt) {
                saveLocalMessage(db, tempMsg);
            }

            try {
                if (text.startsWith('[Voice Message]') || text.startsWith('[Image]') || text.startsWith('[Video]') || text.startsWith('[Document]')) {
                    const isVoice = text.startsWith('[Voice Message]');
                    const isDoc = text.startsWith('[Document]');
                    const isVideo = text.startsWith('[Video]');

                    let localUri = '';
                    let uploadType: 'image' | 'voice' | 'document' | 'video' = 'image';
                    let originalName = '';
                    let docMime = '';

                    if (isVoice) {
                        localUri = text.split(' ')[2];
                        uploadType = 'voice';
                    } else if (isVideo) {
                        localUri = text.split(' ')[1];
                        uploadType = 'video';
                    } else if (isDoc) {
                        const parts = text.split(' | ');
                        localUri = parts[0].replace('[Document] ', '').trim();
                        originalName = parts[1].trim();
                        docMime = parts[2].trim();
                        uploadType = 'document';
                    } else {
                        localUri = text.split(' ')[1];
                        uploadType = 'image';
                    }

                    if (localUri && (localUri.startsWith('file://') || localUri.startsWith('content://'))) {
                        fileData = await uploadChatMessageMediaWithProgress(
                            localUri,
                            uploadType,
                            currentUser.id,
                            (percent) => {
                                // ✅ Update progress for this specific message bubble
                                set((state) => ({
                                    uploadProgress: { ...state.uploadProgress, [tempId]: percent }
                                }));
                            },
                            originalName,
                            docMime,
                            true // encryptWithNewKey
                        );
                        messageToEncrypt = `Sent ${fileData.name || (isVoice ? 'a voice message' : (isVideo ? 'a video' : (isDoc ? 'a document' : 'an image')))}`;

                    }
                }

                const encryptedText = await encryptText(messageToEncrypt, chatKey);
                
                let urlPayload = fileData?.url;
                if (fileData?.mediaKey) {
                    urlPayload = JSON.stringify({ url: fileData.url, mediaKey: fileData.mediaKey });
                }
                const encryptedFileUrl = urlPayload ? await encryptText(urlPayload, chatKey) : null;
                const insertData: any = {
                    sender_id: currentUser.id,
                    message: encryptedText,
                    status: scheduledAt ? 'pending' : 'sent',
                    file_url: encryptedFileUrl,
                    file_name: fileData?.name || null,
                    file_type: fileData?.type || null,
                    file_size: fileData?.size || null,
                    message_type: messageType || 'text',
                };

                if (!scheduledAt) {
                    insertData.is_read = false;
                    insertData.reply_to_id = replyToId;
                    insertData.expires_at = disappearingDuration ? new Date(Date.now() + disappearingDuration * 1000).toISOString() : null;
                } else {
                    insertData.scheduled_at = scheduledAt.toISOString();
                }

                if (isGroup) insertData.group_id = friendId;
                else insertData.receiver_id = friendId;

                const targetTable = scheduledAt ? 'scheduled_messages' : 'messages';
                const { data, error } = await supabase.from(targetTable).insert([insertData]).select().single();
                if (error) throw error;

                let finalMsg: any = null;
                if (!scheduledAt) {
                    finalMsg = { ...data, message: messageToEncrypt, file_url: urlPayload, reply: replyObject };
                    set((state) => {
                        const newMessages = state.messages.map(m => m.id === tempId ? finalMsg : m);
                        saveToCache(`chat_messages_${friendId}`, { messages: newMessages });
                        // ✅ Clear progress for this message on success
                        const newProgress = { ...state.uploadProgress };
                        delete newProgress[tempId];
                        return {
                            messages: newMessages,
                            uploadProgress: newProgress,
                            cache: { ...state.cache, [friendId]: { ...state.cache[friendId], messages: newMessages, key: chatKey } }
                        };
                    });

                    // ✅ Update Local DB (Delete temp message and insert synced one)
                    if (db) {
                        try {
                            await db.runAsync('DELETE FROM messages WHERE id = ?', [tempId]);
                        } catch (e) {
                            console.warn('[DB] Failed to delete temp message:', e);
                        }
                        saveLocalMessage(db, finalMsg);
                        syncLedgerExpense(db, finalMsg, currentUser.id);
                    }
                } else {
                    set((state) => {
                        const newProgress = { ...state.uploadProgress };
                        delete newProgress[tempId];
                        return { uploadProgress: newProgress };
                    });
                    require('react-native').Alert.alert('Success', 'Message scheduled successfully!');
                }

                if (activeChannel && !scheduledAt && finalMsg) {
                    activeChannel.send({
                        type: 'broadcast',
                        event: 'new_message',
                        payload: finalMsg
                    });
                }

                // Send push notification to the recipient (background)
                // if (!isGroup) {
                //    Push notifications are now handled by Supabase Database Webhooks automatically.
                // }
            } catch (error: any) {
                console.error("SendMessage Error:", error);
                // ⚠️ We do NOT delete the message from the list! It will stay as 'pending' (clock icon)
                // When internet comes back, the background syncPendingMessages will upload it.
                logErrorToDB(error, 'ChatStore: Send Message', currentUser.id, currentUser.username);
                // Show error on UI
                import('react-native').then(({ Alert }) => {
                    Alert.alert('Upload Failed', error?.message || JSON.stringify(error));
                });
            }
        },

        reactToMessage: async (messageId, emoji, currentUser) => {
            const { messages, activeChannel, activeChatId, cache, chatKey } = get();
            if (!currentUser || !activeChatId) return;
            try {
                const reactions = { ...(messages.find(m => m.id === messageId)?.reactions || {}) };
                
                // Toggle off if they tap the same emoji again, else set their new emoji
                if (reactions[currentUser.id] === emoji) {
                    delete reactions[currentUser.id];
                } else {
                    reactions[currentUser.id] = emoji;
                }

                const { error } = await supabase.from('messages').update({ reactions }).eq('id', messageId);
                if (error) throw error;

                const newMessages = messages.map(m => m.id === messageId ? { ...m, reactions } : m);
                // ✅ Single atomic set() call
                set((state) => ({
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

        saveEdit: async (messageId, newText, currentUser) => {
            const { chatKey, activeChannel, messages, activeChatId } = get();
            if (!chatKey || !currentUser || !activeChatId) return;
            try {
                const encryptedText = await encryptText(newText, chatKey);
                const { error } = await supabase.from('messages').update({
                    message: encryptedText
                }).eq('id', messageId);

                if (error) throw error;

                const newMessages = messages.map(m => m.id === messageId ? { ...m, message: newText, is_edited: true } : m);
                // ✅ Single atomic set() call
                set((state) => ({
                    messages: newMessages,
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

        deleteMessage: async (messageId, forEveryone) => {
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
                    if (activeChannel) {
                        activeChannel.send({
                            type: 'broadcast',
                            event: 'message_edit',
                            payload: { message_id: messageId, message: encryptedDeletedText }
                        });
                    }
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
                set((state) => ({
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

        forwardMessage: async (messageText, friendIds, currentUser) => {
            if (!currentUser) return;
            try {
                const promises = friendIds.map(async (fid) => {
                    const fKey = await getChatKey(currentUser.id, fid);
                    if (!fKey) throw new Error("Encryption key not found for friend " + fid);
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
            const { globalChannel } = (require('./useFriendsStore').useFriendsStore.getState());

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

        markAsRead: async (messageId, currentUser, friendId, isGroup) => {
            // ✅ Debounced batching: collect IDs for 300ms then flush in one Supabase call
            markAsReadQueue.push(messageId);
            markAsReadMeta = { currentUser, friendId, isGroup, channel: get().activeChannel };

            if (markAsReadTimer) clearTimeout(markAsReadTimer);
            markAsReadTimer = setTimeout(() => {
                markAsReadTimer = null;
                flushMarkAsRead();
            }, 300);
        },

        cleanupChat: () => {
            // Only clear active state, keep messages/key in cache
            set({ activeChannel: null, activeChatId: null, isTyping: false, pageOffset: 0, hasMore: true, loadingMore: false });
            if (typingTimeout) clearTimeout(typingTimeout);
        }
    };
});
