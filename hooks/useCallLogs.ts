import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/supabase';

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
            if (offset === 0) setLoading(true);
            else setLoadingMore(true);

            let user = currentUser;
            if (!user) {
                user = await getCurrentUser();
                setCurrentUser(user);
            }

            if (!user) {
                setLoading(false);
                return;
            }

            const { data: basicLogs, error: logError } = await supabase
                .from('call_logs')
                .select('*')
                .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .order('created_at', { ascending: false })
                .range(offset, offset + PAGE_SIZE - 1);

            if (logError) throw logError;

            if (basicLogs && basicLogs.length > 0) {
                const userIds = [...new Set(basicLogs.flatMap((log: CallLog) => [log.caller_id, log.receiver_id]))];

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
                } else {
                    setLogs(prev => [...prev, ...enrichedLogs]);
                }

                if (basicLogs.length < PAGE_SIZE) {
                    setHasMore(false);
                } else {
                    setHasMore(true);
                }
            } else {
                if (isRefresh || offset === 0) setLogs([]);
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
