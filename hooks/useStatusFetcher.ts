import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useFriendsStore } from '@/store/useFriendsStore';
import { decryptText, getChatKey } from '@/utils/chatCrypto';

export function useStatusFetcher(userId: string | undefined, isArchive: string | undefined, date: string | undefined) {
    const [statuses, setStatuses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
    }, []);

    useEffect(() => {
        const fetchStatuses = async () => {
            if (!userId) {
                setLoading(false);
                return;
            }

            try {
                if (currentUser && userId === currentUser.id) {
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

                const nowIso = new Date().toISOString();
                let query = supabase
                    .from('statuses')
                    .select('*')
                    .eq('user_id', userId)
                    .or('is_deleted.is.null,is_deleted.eq.false');

                if (isArchive === 'true') {
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    query = query.gt('created_at', sevenDaysAgo.toISOString());
                } else {
                    query = query.gt('expires_at', nowIso);
                }

                const { data: statusData } = await query.order('created_at', { ascending: true });
                let accessibleStatuses = statusData || [];

                if (accessibleStatuses.length > 0 && currentUser) {
                    accessibleStatuses = accessibleStatuses.filter((s: any) => {
                        if (s.user_id === currentUser.id) return true;
                        if (s.privacy_type === 'all' || !s.privacy_type) return true;
                        if (s.privacy_type === 'selected' && s.viewer_ids?.includes(currentUser.id)) return true;
                        return false;
                    });
                }

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username, avatar_url')
                    .eq('id', userId)
                    .single();

                if (accessibleStatuses.length > 0) {
                    const statusKey = await getChatKey(userId, userId);

                    const enrichedData = await Promise.all(accessibleStatuses.map(async (s) => {
                        let decryptedContent = s.content;
                        let decryptedMediaUrl = s.media_url;

                        if (s.content && s.content.trim().startsWith('{')) {
                            try { decryptedContent = await decryptText(s.content, statusKey); } catch (e) {}
                        }
                        if (s.media_url && s.media_url.trim().startsWith('{')) {
                            try { decryptedMediaUrl = await decryptText(s.media_url, statusKey); } catch (e) {}
                        }

                        return {
                            ...s,
                            content: decryptedContent,
                            media_url: decryptedMediaUrl,
                            profiles: profile || { username: 'User', avatar_url: null }
                        };
                    }));

                    let filteredData = enrichedData;
                    if (isArchive === 'true' && date) {
                        const nowRef = new Date();
                        filteredData = enrichedData.filter(s => {
                            const sDate = new Date(s.created_at);
                            const diffDays = Math.floor((nowRef.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));

                            let dKey = '';
                            if (diffDays === 0) dKey = 'Today';
                            else if (diffDays === 1) dKey = 'Yesterday';
                            else dKey = sDate.toLocaleDateString('en-US', { weekday: 'long' });

                            return dKey === date;
                        });
                    }
                    setStatuses(filteredData);
                } else {
                    setStatuses([]);
                }
            } catch (error) {
                console.error('Status Fetch Error:', error);
                setStatuses([]);
            } finally {
                setLoading(false);
            }
        };

        fetchStatuses();
    }, [userId, isArchive, date, currentUser]);

    return { statuses, setStatuses, loading, currentUser };
}
