import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useDbStore } from '@/store/useDbStore';
import { getLocalCallLogs, saveLocalCallLog } from '@/lib/localDb';
import { useAuthStore } from '@/store/useAuthStore';
import { getFromCache, saveToCache } from '@/lib/database';

export interface CallLog {
    id: string;
    caller_id: string;
    receiver_id: string;
    call_type: 'audio' | 'video';
    status: string;
    duration: number;
    created_at: string;
    caller?: Profile;
    receiver?: Profile;
}

export interface Profile {
    id: string;
    username: string;
    avatar_url: string | null;
    email?: string;
}

export const useCallLogs = () => {
    const { user: currentUser } = useAuthStore();
    const [logs, setLogs] = useState<CallLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    
    const logsLengthRef = useRef(0);
    useEffect(() => {
        logsLengthRef.current = logs.length;
    }, [logs]);

    const PAGE_SIZE = 15;

    const loadLogs = useCallback(async (offset = 0, isRefresh = false) => {
        try {
            let hasEnrichedCache = false;
            
            if (offset === 0 && !isRefresh) {
                // 1. Instantly load from local cache to skip loading skeleton
                const sqliteCache = getFromCache('call_logs_cache');
                if (sqliteCache && sqliteCache.logs && sqliteCache.logs.length > 0) {
                    setLogs(sqliteCache.logs);
                    setLoading(false); // Skip loading spinner!
                    hasEnrichedCache = true;
                } else {
                    setLoading(true);
                }
            } else if (offset === 0 && isRefresh) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            if (!currentUser?.id) {
                if (__DEV__) console.log('[DEBUG] useCallLogs: Invalid User ID detected, skipping query.', { id: currentUser?.id });
                if (offset === 0) setLoading(false);
                else setLoadingMore(false);
                return;
            }

            // 1. Load from Local DB first for instant UI (only if no enriched cache)
            if (offset === 0 && !hasEnrichedCache) {
                const { db } = useDbStore.getState();
                if (db) {
                    const localLogs = await getLocalCallLogs(db, currentUser.id);
                    if (localLogs.length > 0) {
                        if (__DEV__) console.log(`useCallLogs: Loaded ${localLogs.length} logs from Local DB`);
                        // Note: Profiles won't be enriched yet, but we show what we have
                        setLogs(localLogs as any);
                        setLoading(false);
                    }
                }
            }

            if (__DEV__) console.log(`[DEBUG] useCallLogs: Querying logs for UUID: "${currentUser.id}"`);
            const { data: rawLogs, error: logError } = await supabase
                .from('call_logs')
                .select('*, caller:profiles!caller_id(id,username,avatar_url,email), receiver:profiles!receiver_id(id,username,avatar_url,email)')
                .or(`caller_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
                .order('created_at', { ascending: false })
                .range(offset, offset + PAGE_SIZE - 1);

            if (logError) throw logError;

            if (rawLogs && rawLogs.length > 0) {
                // Supabase joins can return arrays for one-to-many relationships even if we expect single objects, 
                // but since these are explicit one-to-one FK links, they are objects. We handle both just in case.
                const enrichedLogs = rawLogs.map((log: any) => ({
                    ...log,
                    caller: Array.isArray(log.caller) ? log.caller[0] : log.caller,
                    receiver: Array.isArray(log.receiver) ? log.receiver[0] : log.receiver
                }));

                if (isRefresh || offset === 0) {
                    setLogs(enrichedLogs);
                    // ✅ Save fresh first-page logs to SQLite cache
                    saveToCache('call_logs_cache', { logs: enrichedLogs });
                } else {
                    setLogs(prev => {
                        const all = [...prev, ...enrichedLogs];
                        // ✅ Fast O(n) Map deduplication
                        const deduped = [...new Map(all.map(item => [item.id, item])).values()];
                        // ✅ Save paginated logs to SQLite cache too
                        saveToCache('call_logs_cache', { logs: deduped });
                        return deduped;
                    });
                }

                if (rawLogs.length < PAGE_SIZE) {
                    setHasMore(false);
                } else {
                    setHasMore(true);
                }

                // 2. Save fetched logs to Local DB concurrently
                const { db } = useDbStore.getState();
                if (db) {
                    Promise.all(rawLogs.map((log: any) => saveLocalCallLog(db, log)))
                        .catch(err => {
                            if (__DEV__) console.error("Error saving local call logs batch:", err);
                        });
                }
            } else {
                if (isRefresh || offset === 0) {
                    setLogs([]);
                    saveToCache('call_logs_cache', { logs: [] });
                }
                setHasMore(false);
            }

        } catch (err) {
            if (__DEV__) console.error("Error loading call logs:", err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [currentUser?.id]);

    useEffect(() => {
        if (currentUser?.id) {
            loadLogs(0, false);
        }
    }, [currentUser?.id, loadLogs]);

    const refreshLogs = useCallback(() => {
        loadLogs(0, true);
    }, [loadLogs]);

    const loadMoreLogs = useCallback(() => {
        if (!loadingMore && hasMore) {
            loadLogs(logsLengthRef.current);
        }
    }, [loadingMore, hasMore, loadLogs]);

    return {
        logs,
        loading,
        loadingMore,
        hasMore,
        refreshLogs,
        loadMoreLogs,
        currentUser
    };
};
