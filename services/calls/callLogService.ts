import { supabase } from '@/lib/supabase';
import { useDbStore } from '@/store/useDbStore';
import { getLocalCallLogs, saveLocalCallLog } from '@/lib/localDb';
import { getFromCache, saveToCache } from '@/lib/database';

export interface Profile {
    id: string;
    username: string;
    avatar_url: string | null;
    email?: string;
}

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

export const PAGE_SIZE = 15;

export const loadCallLogsFromCache = (): CallLog[] | null => {
    const sqliteCache = getFromCache('call_logs_cache');
    if (sqliteCache && sqliteCache.logs && sqliteCache.logs.length > 0) {
        return sqliteCache.logs;
    }
    return null;
};

export const loadCallLogsFromLocalDb = async (userId: string): Promise<CallLog[] | null> => {
    const { db } = useDbStore.getState();
    if (db) {
        const localLogs = await getLocalCallLogs(db, userId);
        if (localLogs.length > 0) {
            return localLogs as any;
        }
    }
    return null;
};

export const fetchCallLogsFromServer = async (userId: string, offset = 0): Promise<{ logs: CallLog[], hasMore: boolean }> => {
    const { data: rawLogs, error: logError } = await supabase
        .from('call_logs')
        .select('*')
        .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

    if (logError) throw logError;

    if (!rawLogs || rawLogs.length === 0) {
        return { logs: [], hasMore: false };
    }

    const userIds = new Set<string>();
    rawLogs.forEach(log => {
        if (log.caller_id) userIds.add(log.caller_id);
        if (log.receiver_id) userIds.add(log.receiver_id);
    });

    const { data: profiles } = await supabase
        .from('profiles')
        .select('id,username,avatar_url,email')
        .in('id', Array.from(userIds));

    const profileMap: Record<string, any> = {};
    if (profiles) {
        profiles.forEach(p => profileMap[p.id] = p);
    }

    const enrichedLogs = rawLogs.map((log: any) => ({
        ...log,
        caller: profileMap[log.caller_id] || null,
        receiver: profileMap[log.receiver_id] || null
    }));

    return { logs: enrichedLogs, hasMore: rawLogs.length === PAGE_SIZE };
};

export const saveCallLogsToCache = (logs: CallLog[]) => {
    saveToCache('call_logs_cache', { logs });
};

export const saveCallLogsToLocalDb = async (logs: CallLog[]) => {
    const { db } = useDbStore.getState();
    if (db) {
        Promise.all(logs.map((log: any) => saveLocalCallLog(db, log)))
            .catch(err => {
                if (__DEV__) console.error("Error saving local call logs batch:", err);
            });
    }
};
