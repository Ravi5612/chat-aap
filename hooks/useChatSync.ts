import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useDbStore } from '@/store/useDbStore';
import {
    saveLocalMessage,
    getLocalWallpaper,
    saveLocalWallpaper,
    getLocalDraft,
    saveLocalDraft,
    getPendingDeliveredMessages,
    markMessageDeliveredLocally
} from '@/lib/localDb';

export function useChatSync(
    roomId: string,
    safeFriendId: string,
    currentUser: any,
    isGroup: boolean,
    messages: any[]
) {
    const [wallpaper, setWallpaper] = useState<string | null>(null);
    const [draft, setDraft] = useState('');
    const [isDraftLoaded, setIsDraftLoaded] = useState(false);

    const logDebug = useCallback((msg: string) => {}, []);

    const loadDraft = useCallback(async () => {
        try {
            logDebug("Loading local draft for room: " + roomId);
            const { db } = useDbStore.getState();
            if (db && roomId) {
                const savedDraft = await getLocalDraft(db, roomId);
                setDraft(savedDraft || '');
                logDebug("Draft loaded: " + (savedDraft ? savedDraft.substring(0, 15) : "empty"));
                setIsDraftLoaded(true);
            } else {
                logDebug("DB not ready for draft loading");
                setIsDraftLoaded(true);
            }
        } catch (e: any) {
            logDebug("Draft load error: " + e.message);
            console.error('[DRAFT] Load failed:', e);
            setIsDraftLoaded(true);
        }
    }, [roomId, logDebug]);

    const handleDraftChange = useCallback((text: string) => {
        setDraft(text);
        const { db } = useDbStore.getState();
        if (db && roomId) {
            saveLocalDraft(db, roomId, text);
        }
    }, [roomId]);

    const loadWallpaper = useCallback(async () => {
        try {
            const { db } = useDbStore.getState();
            if (db && roomId) {
                logDebug(`Loading shared wallpaper for room: ${roomId}`);
                let uri = await getLocalWallpaper(db, roomId);
                
                // Only fetch from Supabase if we don't have it locally or just to sync
                const { data, error } = await supabase
                    .from('chat_wallpapers')
                    .select('wallpaper_url')
                    .eq('chat_id', roomId)
                    .maybeSingle();
                
                if (!error && data?.wallpaper_url) {
                    uri = data.wallpaper_url;
                    await saveLocalWallpaper(db, roomId, uri);
                }
                setWallpaper(uri);
                logDebug("Wallpaper loaded successfully: " + (uri ? "Yes" : "No"));
            } else {
                logDebug("DB not ready for wallpaper loading");
            }
        } catch (e: any) {
            logDebug("Wallpaper load error: " + e.message);
            console.error('[WALLPAPER] Load failed:', e);
        }
    }, [roomId, logDebug]);

    const markMessagesAsReadLocally = useCallback(async () => {
        try {
            logDebug("Marking messages as read locally...");
            const { db } = useDbStore.getState();
            if (db && safeFriendId && currentUser?.id) {
                await db.runAsync(
                    'UPDATE messages SET status = ? WHERE receiver_id = ? AND sender_id = ? AND status != ?',
                    ['read', currentUser.id, safeFriendId, 'read']
                );
                logDebug("Messages marked as read locally");
            } else {
                logDebug("DB/Ids not ready for marking read");
            }
        } catch (e: any) {
            logDebug("Mark read failed: " + e.message);
            console.warn('[DB] Mark read failed:', e);
        }
    }, [safeFriendId, currentUser?.id, logDebug]);

    const syncDeliveredReceipts = useCallback(async () => {
        const { db } = useDbStore.getState();
        if (!db || !currentUser?.id || !safeFriendId) return;
        try {
            const pending = await getPendingDeliveredMessages(db, currentUser.id);
            if (pending.length === 0) return;

            for (const msg of pending) {
                await markMessageDeliveredLocally(db, msg.id);
            }

            const ids = pending.map((m: any) => m.id);
            await supabase
                .from('messages')
                .update({ status: 'delivered' })
                .in('id', ids);

        } catch (e) {
            console.warn('[DELIVERED] Sync failed:', e);
        }
    }, [currentUser?.id, safeFriendId]);

    const syncReadReceipts = useCallback(async () => {
        const { db } = useDbStore.getState();
        if (db && safeFriendId && currentUser?.id) {
            try {
                const { error } = await supabase
                    .from('messages')
                    .update({ status: 'read' })
                    .eq('receiver_id', currentUser.id)
                    .eq('sender_id', safeFriendId)
                    .eq('status', 'delivered');

                if (error) throw error;
            } catch (error) {
                console.error('[SYNC] Read receipts failed:', error);
            }
        }
    }, [safeFriendId, currentUser?.id]);



    useEffect(() => {
        setWallpaper(null);
        loadWallpaper();
        loadDraft();
        markMessagesAsReadLocally();
        syncDeliveredReceipts();
    }, [roomId, loadWallpaper, loadDraft, markMessagesAsReadLocally, syncDeliveredReceipts]);

    useEffect(() => {
        syncReadReceipts();
    }, [syncReadReceipts]);



    useEffect(() => {
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.message?.includes('changed the chat wallpaper')) {
                loadWallpaper();
            }
            if (lastMsg.sender_id !== currentUser?.id) {
                markMessagesAsReadLocally();
            }
        }
    }, [messages, markMessagesAsReadLocally, loadWallpaper, currentUser?.id]);

    return {
        wallpaper,
        setWallpaper,
        draft,
        setDraft,
        isDraftLoaded,
        handleDraftChange,
        loadWallpaper
    };
}
