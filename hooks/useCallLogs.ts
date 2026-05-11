import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/supabase';
import { useDbStore } from '@/store/useDbStore';
import { getLocalCallLogs, saveLocalCallLog } from '@/lib/localDb';

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
    const [logs, setLogs] = useState<CallLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const PAGE_SIZE = 15;

    const loadLogs = async (offset = 0, isRefresh = false) => {
        try {
            if (offset === 0 && !isRefresh) {
                // 1. Instantly load from local SQLite cache to skip loading skeleton
                const sqliteCache = require('@/lib/database').getFromCache('call_logs_cache');
                if (sqliteCache && sqliteCache.logs && sqliteCache.logs.length > 0) {
                    setLogs(sqliteCache.logs);
                    setLoading(false); // Skip loading spinner!
                } else {
                    setLoading(true);
                }
            } else if (offset === 0 && isRefresh) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            let user = currentUser;
            if (!user) {
                user = await getCurrentUser();
                setCurrentUser(user);
            }

            if (!user || !user.id || String(user.id) === 'null' || String(user.id) === 'undefined') {
                console.log('[DEBUG] useCallLogs: Invalid User ID detected, skipping query.', { id: user?.id });
                if (offset === 0) setLoading(false);
                else setLoadingMore(false);
                return;
            }

            // 1. Load from Local DB first for instant UI
            if (offset === 0) {
                const { db } = useDbStore.getState();
                if (db) {
                    const localLogs = await getLocalCallLogs(db, user.id);
                    if (localLogs.length > 0) {
                        console.log(`useCallLogs: Loaded ${localLogs.length} logs from Local DB`);
                        // Note: Profiles won't be enriched yet, but we show what we have
                        setLogs(localLogs as any);
                        setLoading(false);
                    }
                }
            }

            console.log(`[DEBUG] useCallLogs: Querying logs for UUID: "${user.id}"`);
            const { data: basicLogs, error: logError } = await supabase
                .from('call_logs')
                .select('*')
                .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .order('created_at', { ascending: false })
                .range(offset, offset + PAGE_SIZE - 1);

            if (logError) throw logError;

            if (basicLogs && basicLogs.length > 0) {
                const userIds = [...new Set(basicLogs.flatMap((log: CallLog) => [log.caller_id, log.receiver_id]))].filter(id => id && id !== 'null');

                const { data: profiles, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url, email')
                    .in('id', userIds);

                if (profileError) throw profileError;

                const profileMap = (profiles || []).reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {});

                const enrichedLogs = basicLogs.map((log: CallLog) => ({
                    ...log,
                    caller: profileMap[log.caller_id],
                    receiver: profileMap[log.receiver_id]
                }));

                if (isRefresh || offset === 0) {
                    setLogs(enrichedLogs);
                    // ✅ Save fresh first-page logs to SQLite cache
                    require('@/lib/database').saveToCache('call_logs_cache', { logs: enrichedLogs });
                } else {
                    setLogs(prev => {
                        const all = [...prev, ...enrichedLogs];
                        const deduplicated = all.filter((item, index, self) =>
                            index === self.findIndex((t) => t.id === item.id)
                        );
                        // ✅ Save paginated logs to SQLite cache too
                        require('@/lib/database').saveToCache('call_logs_cache', { logs: deduplicated });
                        return deduplicated;
                    });
                }

                if (basicLogs.length < PAGE_SIZE) {
                    setHasMore(false);
                } else {
                    setHasMore(true);
                }

                // 2. Save fetched logs to Local DB
                const { db } = useDbStore.getState();
                if (db) {
                    basicLogs.forEach(log => saveLocalCallLog(db, log));
                }
            } else {
                if (isRefresh || offset === 0) {
                    setLogs([]);
                    require('@/lib/database').saveToCache('call_logs_cache', { logs: [] });
                }
                setHasMore(false);
            }

        } catch (err) {
            console.error("Error loading call logs:", err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, []);

    const refreshLogs = () => {
        loadLogs(0, true);
    };

    const loadMoreLogs = () => {
        if (!loadingMore && hasMore) {
            loadLogs(logs.length);
        }
    };

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
