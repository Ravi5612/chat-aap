import { getFromCache, saveToCache } from '@/lib/database';
import { getChatClearTimestamp, getLocallyDeletedMessages, getLocalMessages, saveLocalMessage, syncLedgerExpense } from '@/lib/localDb';
import { supabase } from '@/lib/supabase';
import { getChatKey } from '@/utils/chatCrypto';
import { logErrorToDB } from '@/utils/errorLogger';
import { useDbStore } from '../useDbStore';
import { StoreGet, StoreSet } from './chatTypes';
import { decryptMessageBatch, filterDeletedMessages } from '@/utils/chatHelpers';


export const createChatLoadActions = (set: StoreSet, get: StoreGet) => ({
    initChat: async (friendId: string, currentUser: any, isGroup: boolean) => {
        if (!currentUser || !friendId) return;
        const { cache } = get();

        const sqliteCache = getFromCache(`chat_messages_${friendId}`);

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
            set((state: any) => ({
                chatKey: key,
                cache: { ...state.cache, [friendId]: { ...state.cache[friendId], messages: state.cache[friendId]?.messages || sqliteCache?.messages || [], key } }
            }));
        } catch (err) {
            console.error("ChatStore: Key error:", err);
        }
    },

    loadMessages: async (friendId: string, currentUser: any, isGroup: boolean) => {
        const { chatKey: existingChatKey, cache, messages } = get();
        if (!friendId || !currentUser) return;

        // If chatKey is missing, try to get it before loading
        let chatKey = existingChatKey;
        if (!chatKey) {
            try {
                chatKey = await getChatKey(currentUser.id, friendId, isGroup);
                if (chatKey) {
                    set((state: any) => ({
                        chatKey,
                        cache: { ...state.cache, [friendId]: { ...state.cache[friendId], messages: state.cache[friendId]?.messages || [], key: chatKey! } }
                    }));
                }
            } catch (e) {
                console.warn('[ChatStore] Failed to get chatKey in loadMessages:', e);
            }
        }
        if (!chatKey) return; // truly no key available even after retry


        const PAGE_SIZE = 100;
        let hasLocalMessages = false;

        try {
            const { db } = useDbStore.getState();
            if (db && friendId) {
                const clearTimestamp = await getChatClearTimestamp(db, friendId);
                const localDeletedIds = await getLocallyDeletedMessages(db);
                let localMsgs = await getLocalMessages(db, friendId, isGroup, PAGE_SIZE, 0);
                localMsgs = localMsgs.reverse();

                if (clearTimestamp) {
                    localMsgs = localMsgs.filter(m => m && m.created_at && new Date(m.created_at) > new Date(clearTimestamp));
                }

                if (localDeletedIds && localDeletedIds.length > 0) {
                    localMsgs = localMsgs.filter(m => m && m.id && !localDeletedIds.includes(m.id));
                }

                if (localMsgs && localMsgs.length > 0) {
                    hasLocalMessages = true;
                    console.log(`ChatStore: Loaded ${localMsgs.length} messages from Local DB`);
                    // ✅ Decrypt local messages before showing them
                    const decryptedLocalMsgs = await decryptMessageBatch(localMsgs, chatKey, currentUser.id);
                    set({
                        messages: decryptedLocalMsgs,
                        loading: false,
                        hasMore: localMsgs.length >= PAGE_SIZE,
                        cache: { ...get().cache, [friendId]: { messages: decryptedLocalMsgs, key: chatKey } }
                    });
                }
            }
        } catch (dbErr) {
            console.warn('[DB] Local load failed, falling back to network:', dbErr);
        }

        const isFirstLoad = !cache[friendId] || cache[friendId].messages.length === 0;
        if (isFirstLoad && get().messages.length === 0 && !hasLocalMessages) {
            set({ loading: true });
        }

        try {
            const { db } = useDbStore.getState();
            const clearTimestamp = db ? await getChatClearTimestamp(db, friendId) : null;

            let query = supabase
                .from('messages')
                .select('*, reply:reply_to_id(id, message, sender_id, created_at, group_id, key_version)');

            if (isGroup) {
                query = query.eq('group_id', friendId);
            } else {
                query = query.or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUser.id})`);
            }

            if (clearTimestamp) {
                query = query.gt('created_at', clearTimestamp);
            }

            const { data: rawData, error } = await query.order('created_at', { ascending: false }).limit(PAGE_SIZE);
            if (error) throw error;
            
            const data = (rawData || []).reverse();

            // Decrypt and filter
            const decryptedMessages = await decryptMessageBatch(data, chatKey, currentUser.id);
            const finalMessages = await filterDeletedMessages(db, decryptedMessages);

            const activeChatId = get().activeChatId;
            if (activeChatId === friendId) {
                const existingOfflineMsgs = get().messages.filter((m: any) => m.status === 'pending' || m.status === 'failed');
                const combined = [...finalMessages, ...existingOfflineMsgs];
                combined.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                const uniqueMessages = Array.from(new Map(combined.map(m => [m.id, m])).values());

                set({
                    messages: uniqueMessages,
                    loading: false,
                    hasMore: data.length === PAGE_SIZE,
                });

                if (db) {
                    const { useAuthStore } = require('../useAuthStore');
                    const currentUserId = useAuthStore.getState().user?.id;
                    for (const msg of finalMessages) {
                        await saveLocalMessage(db, msg);
                        if (currentUserId) await syncLedgerExpense(db, msg, currentUserId);
                    }
                }
            }

            const uniqueMessagesArray = Array.from(new Map(decryptedMessages.map(m => [m.id, m])).values());
            set((state: any) => ({
                cache: { ...state.cache, [friendId]: { messages: uniqueMessagesArray, key: chatKey } }
            }));
            saveToCache(`chat_messages_${friendId}`, { messages: uniqueMessagesArray });

            const unreadIds = (data || [])
                .filter(m => (isGroup ? m.sender_id !== currentUser.id : m.sender_id === friendId) && !m.is_read)
                .map(m => m.id);

            // Update state locally so any incoming messages we fetched show as read
            if (unreadIds.length > 0) {
                const activeChatId = get().activeChatId;
                if (activeChatId === friendId) {
                    set((state: any) => ({
                        messages: state.messages.map((m: any) => unreadIds.includes(m.id) ? { ...m, is_read: true, status: 'read' } : m)
                    }));
                }
            }

            // BULK update all unread messages in the database (not just the 20 fetched ones)
            try {
                let updateQuery = supabase.from('messages').update({ is_read: true, status: 'read' });
                
                if (isGroup) {
                    updateQuery = updateQuery.eq('group_id', friendId).neq('sender_id', currentUser.id).eq('is_read', false);
                } else {
                    updateQuery = updateQuery.eq('sender_id', friendId).eq('receiver_id', currentUser.id).eq('is_read', false);
                }
                
                // Fire and forget
                updateQuery.then(({ error }) => {
                    if (error) {
                        console.error('Bulk mark as read error:', error);
                    } else {
                        const { activeChannel } = get();
                        if (activeChannel) {
                            activeChannel.send({
                                type: 'broadcast',
                                event: 'status_update',
                                payload: { status: 'read', sender_id: currentUser.id, group_id: isGroup ? friendId : null }
                            });
                        }
                    }
                });
            } catch (bulkErr) {
                console.error('Bulk mark as read catch:', bulkErr);
            }
        } catch (error: any) {
            console.error('ChatStore: Load error:', error.message);
            set({ loading: false });
            logErrorToDB(error, 'ChatStore: Load Messages', currentUser.id, currentUser.username);
        }
    },

    loadMoreMessages: async (friendId: string, currentUser: any, isGroup: boolean) => {
        const { chatKey, messages, hasMore, loadingMore } = get();
        if (!friendId || !currentUser || !chatKey || !hasMore || loadingMore) return;

        const PAGE_SIZE = 100;
        set({ loadingMore: true });

        try {
            const { db } = useDbStore.getState();
            const currentLocalCount = messages.length;
            let olderLocalMsgs: any[] = [];

            if (db) {
                olderLocalMsgs = await getLocalMessages(db, friendId, isGroup, PAGE_SIZE, currentLocalCount);
                olderLocalMsgs = olderLocalMsgs.reverse();
            }

            if (olderLocalMsgs.length > 0) {
                console.log(`ChatStore: Loaded ${olderLocalMsgs.length} older messages from Local DB`);
                // ✅ Decrypt local messages before showing them
                const decryptedOlderLocal = await decryptMessageBatch(olderLocalMsgs, chatKey, currentUser.id);
                const combined = [...decryptedOlderLocal, ...messages];
                const unique = Array.from(new Map(combined.map(m => [m.id, m])).values());

                set({ messages: unique, loadingMore: false, hasMore: true });
                return;
            }

            // Store is ASC (oldest→newest), so messages[0] is the oldest message — correct for pagination
            const oldestMsg = messages[0];
            if (!oldestMsg || !oldestMsg.created_at) {
                set({ loadingMore: false, hasMore: false });
                return;
            }

            const clearTimestamp = db ? await getChatClearTimestamp(db, friendId) : null;

            let query = supabase
                .from('messages')
                .select('*, reply:reply_to_id(id, message, sender_id, created_at, group_id, key_version)');

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

            // Decrypt and filter
            const decryptedOlderMessages = await decryptMessageBatch(data, chatKey, currentUser.id);
            const filteredOlderMessages = await filterDeletedMessages(db, decryptedOlderMessages);

            const combinedMessages = [...filteredOlderMessages, ...messages].filter(m => m && m.id);
            const uniqueMessages = Array.from(new Map(combinedMessages.map(m => [m.id, m])).values());

            set((state: any) => ({
                messages: uniqueMessages,
                loadingMore: false,
                hasMore: data.length === PAGE_SIZE,
                cache: { ...state.cache, [friendId]: { messages: uniqueMessages, key: chatKey } }
            }));

            saveToCache(`chat_messages_${friendId}`, { messages: uniqueMessages });

        } catch (error: any) {
            console.error('ChatStore: LoadMore error:', error.message);
            set({ loadingMore: false });
            logErrorToDB(error, 'ChatStore: Load More Messages', currentUser.id, currentUser.username);
        }
    },

    loadMessagesUpToId: async (friendId: string, currentUser: any, isGroup: boolean, targetMsgId: string, targetCreatedAt: string) => {
        const { chatKey, messages } = get();
        if (!friendId || !currentUser || !chatKey || !targetMsgId || !targetCreatedAt) return false;

        try {
            const { db } = useDbStore.getState();
            if (db) {
                const clearTimestamp = await getChatClearTimestamp(db, friendId);
                const localDeletedIds = await getLocallyDeletedMessages(db);

                const query = isGroup 
                    ? 'SELECT * FROM messages WHERE group_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 150'
                    : 'SELECT * FROM messages WHERE (sender_id = ? OR receiver_id = ?) AND group_id IS NULL AND created_at >= ? ORDER BY created_at DESC LIMIT 150';
                
                const params = isGroup ? [friendId, targetCreatedAt] : [friendId, friendId, targetCreatedAt];
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
                    console.log(`[Store] loadMessagesUpToId: Found target message in SQLite.`);
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

        try {
            console.log(`[Store] loadMessagesUpToId: Fetching from Supabase starting from ${targetCreatedAt}`);
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
                // Decrypt and filter
                const decryptedMessages = await decryptMessageBatch(data, chatKey, currentUser.id);
                const { db } = useDbStore.getState();
                const filtered = await filterDeletedMessages(db, decryptedMessages);

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
    }
});
