import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useFriendsStore } from '@/store/useFriendsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { 
    processRawStatuses, 
    fetchLocalStatuses, 
    fetchRemoteStatusesQuery,
    saveStatusesToLocalDb 
} from '@/services/status/statusFetcherService';

export function useStatusFetcher(userId: string | undefined, isArchive: string | undefined, date: string | undefined) {
    const [statuses, setStatuses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(useAuthStore.getState().user);

    useEffect(() => {
        const user = useAuthStore.getState().user;
        if (user) {
            setCurrentUser(user);
        } else {
            supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
        }
    }, []);

    useEffect(() => {
        const fetchStatuses = async () => {
            if (!userId || !currentUser) {
                // Keep loading true until currentUser is available
                return;
            }

            try {
                // Own Active Statuses (Memory Cache)
                if (currentUser && userId === currentUser.id && isArchive !== 'true') {
                    const localActive = useFriendsStore.getState().myStatuses?.active || [];
                    if (localActive.length > 0) {
                        const enriched = localActive.map((s: any) => ({
                            ...s,
                            profiles: s.profiles || {
                                username: currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'Me',
                                avatar_url: currentUser.user_metadata?.avatar_url || null
                            }
                        }));
                        setStatuses(enriched);
                        setLoading(false);
                        return;
                    }
                }

                const processParams = { isLocal: false, currentUser, userId, isArchive, date, rawStatuses: [] };

                // --- 1. LOCAL SQLITE CACHE FIRST ---
                const userLocalStatuses = await fetchLocalStatuses(userId);
                if (userLocalStatuses.length > 0) {
                    const processedLocal = await processRawStatuses({ ...processParams, rawStatuses: userLocalStatuses, isLocal: true });
                    if (processedLocal.length > 0) {
                        setStatuses(processedLocal);
                        setLoading(false); // INSTANT RENDER OFFLINE
                    }
                }

                // --- 2. BACKGROUND SUPABASE SYNC ---
                fetchRemoteStatusesQuery(userId, isArchive).then(async ({ data: statusData, error }) => {
                    if (error) {
                        console.error('[STATUS] Supabase Sync Error:', error);
                        setLoading(false);
                        return;
                    }

                    if (statusData && statusData.length > 0) {
                        const processedRemote = await processRawStatuses({ ...processParams, rawStatuses: statusData });
                        
                        // Update UI seamlessly
                        setStatuses(prev => {
                            // Only update if there's a difference to avoid flicker
                            if (prev.length === processedRemote.length) {
                                const isSame = prev.every((p, i) => p.id === processedRemote[i].id);
                                if (isSame) return prev;
                            }
                            return processedRemote;
                        });

                        // Save to Local DB for next time
                        saveStatusesToLocalDb(statusData);
                    } else {
                        setStatuses([]);
                    }
                    setLoading(false);
                });

            } catch (error) {
                console.error('Status Fetch Master Error:', error);
                setStatuses([]);
                setLoading(false);
            }
        };

        fetchStatuses();
    }, [userId, isArchive, date, currentUser]);

    return { statuses, setStatuses, loading, currentUser };
}
