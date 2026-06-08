import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import {
    CallLog,
    Profile,
    PAGE_SIZE,
    loadCallLogsFromCache,
    loadCallLogsFromLocalDb,
    fetchCallLogsFromServer,
    saveCallLogsToCache,
    saveCallLogsToLocalDb
} from '@/services/calls/callLogService';

export type { CallLog, Profile };

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

    const loadLogs = useCallback(async (offset = 0, isRefresh = false) => {
        try {
            let hasEnrichedCache = false;
            
            if (offset === 0 && !isRefresh) {
                // 1. Instantly load from local cache to skip loading skeleton
                const cachedLogs = loadCallLogsFromCache();
                if (cachedLogs) {
                    setLogs(cachedLogs);
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
                const localLogs = await loadCallLogsFromLocalDb(currentUser.id);
                if (localLogs) {
                    if (__DEV__) console.log(`useCallLogs: Loaded ${localLogs.length} logs from Local DB`);
                    // Note: Profiles won't be enriched yet, but we show what we have
                    setLogs(localLogs);
                    setLoading(false);
                }
            }

            if (__DEV__) console.log(`[DEBUG] useCallLogs: Querying logs for UUID: "${currentUser.id}"`);
            const { logs: enrichedLogs, hasMore: moreAvailable } = await fetchCallLogsFromServer(currentUser.id, offset);

            if (enrichedLogs.length > 0) {
                if (isRefresh || offset === 0) {
                    setLogs(enrichedLogs);
                    saveCallLogsToCache(enrichedLogs);
                } else {
                    setLogs(prev => {
                        const all = [...prev, ...enrichedLogs];
                        // Fast O(n) Map deduplication
                        const deduped = [...new Map(all.map(item => [item.id, item])).values()];
                        saveCallLogsToCache(deduped);
                        return deduped;
                    });
                }

                setHasMore(moreAvailable);

                // 2. Save fetched logs to Local DB concurrently
                saveCallLogsToLocalDb(enrichedLogs);
            } else {
                if (isRefresh || offset === 0) {
                    setLogs([]);
                    saveCallLogsToCache([]);
                }
                setHasMore(false);
            }

        } catch (err) {
            if (__DEV__) console.error("Error loading call logs:", err);
            setHasMore(false);
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
