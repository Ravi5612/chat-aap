import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useFriendsStore } from '@/store/useFriendsStore';
import { decryptText, getChatKey, decryptKeyWithSharedSecret } from '@/utils/chatCrypto';

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
                // Own Active Statuses (Memory Cache)
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

                // Helper to process and decrypt raw status data
                const processStatuses = async (rawStatuses: any[], isLocal: boolean) => {
                    if (!rawStatuses || rawStatuses.length === 0) return [];
                    
                    let accessibleStatuses = rawStatuses;
                    if (!isLocal && currentUser) {
                        accessibleStatuses = accessibleStatuses.filter((s: any) => {
                            if (s.user_id === currentUser.id) return true;
                            if (s.privacy_type === 'all' || !s.privacy_type) return true;
                            if (s.privacy_type === 'selected') {
                                let v_ids = s.viewer_ids;
                                let m_ids = s.mentioned_user_ids;
                                if (typeof v_ids === 'string') { try { v_ids = JSON.parse(v_ids); } catch(e){} }
                                if (typeof m_ids === 'string') { try { m_ids = JSON.parse(m_ids); } catch(e){} }
                                const isViewer = v_ids?.includes(currentUser.id);
                                const isMentioned = m_ids?.includes(currentUser.id);
                                if (isViewer || isMentioned) return true;
                            }
                            return false;
                        });
                    }

                    // Get Profile
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('username, avatar_url, public_key')
                        .eq('id', userId)
                        .single();

                    let allMentionedIds: string[] = [];
                    accessibleStatuses.forEach((s: any) => {
                        let m_ids = s.mentioned_user_ids;
                        if (typeof m_ids === 'string') { try { m_ids = JSON.parse(m_ids); } catch(e){} }
                        if (m_ids && Array.isArray(m_ids)) {
                            allMentionedIds.push(...m_ids);
                        }
                    });
                    allMentionedIds = [...new Set(allMentionedIds)];

                    let mentionedProfilesMap: Record<string, any> = {};
                    if (allMentionedIds.length > 0) {
                        const { data: mProfiles } = await supabase.from('profiles').select('id, username, avatar_url').in('id', allMentionedIds);
                        if (mProfiles) {
                            mProfiles.forEach(p => { mentionedProfilesMap[p.id] = p; });
                        }
                    }

                    const enrichedData = await Promise.all(accessibleStatuses.map(async (s) => {
                        let statusKey = null;
                        let encKeys = s.encrypted_keys;
                        if (typeof encKeys === 'string') { try { encKeys = JSON.parse(encKeys); } catch(e){} }

                        if (encKeys && currentUser?.id) {
                            const encryptedMasterKey = encKeys[currentUser.id];
                            if (encryptedMasterKey && profile?.public_key) {
                                statusKey = await decryptKeyWithSharedSecret(encryptedMasterKey, profile.public_key, currentUser.id);
                            }
                        }
                        if (!statusKey) {
                            statusKey = await getChatKey(userId, userId);
                        }

                        let decryptedContent = s.content;
                        let decryptedMediaUrl = s.media_url;
                        let decryptedAudioUrl = s.audio_url;

                        if (statusKey) {
                            if (s.content && s.content.trim().startsWith('{')) {
                                try { decryptedContent = await decryptText(s.content, statusKey); } catch (e) {}
                            }
                            if (s.media_url && s.media_url.trim().startsWith('{')) {
                                try { decryptedMediaUrl = await decryptText(s.media_url, statusKey); } catch (e) {}
                            }
                            if (s.audio_url && s.audio_url.trim().startsWith('{')) {
                                try { decryptedAudioUrl = await decryptText(s.audio_url, statusKey); } catch (e) {}
                            }
                        }

                        let m_ids = s.mentioned_user_ids;
                        if (typeof m_ids === 'string') { try { m_ids = JSON.parse(m_ids); } catch(e){} }
                        const mentionedProfiles = (m_ids || []).map((id: string) => mentionedProfilesMap[id]).filter(Boolean);

                        return {
                            ...s,
                            content: decryptedContent,
                            media_url: decryptedMediaUrl,
                            audio_url: decryptedAudioUrl,
                            statusKey: statusKey,
                            profiles: profile || { username: 'User', avatar_url: null },
                            mentionedProfiles
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
                    return filteredData.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                };

                // --- 1. LOCAL SQLITE CACHE FIRST ---
                try {
                    const { useDbStore } = await import('@/store/useDbStore');
                    const { getLocalStatuses } = await import('@/lib/localDb');
                    const { db } = useDbStore.getState();
                    
                    if (db) {
                        const localStatuses = await getLocalStatuses(db);
                        if (localStatuses && localStatuses.length > 0) {
                            const userLocalStatuses = localStatuses.filter((s: any) => 
                                s.user_id === userId && (s.is_deleted === 0 || s.is_deleted === false || s.is_deleted === '0')
                            );
                            
                            if (userLocalStatuses.length > 0) {
                                const processedLocal = await processStatuses(userLocalStatuses, true);
                                if (processedLocal.length > 0) {
                                    setStatuses(processedLocal);
                                    setLoading(false); // INSTANT RENDER OFFLINE
                                }
                            }
                        }
                    }
                } catch (localError) {
                    console.error('[STATUS] Local Cache Read Error:', localError);
                }

                // --- 2. BACKGROUND SUPABASE SYNC ---
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

                query.order('created_at', { ascending: true }).then(async ({ data: statusData, error }) => {
                    if (error) {
                        console.error('[STATUS] Supabase Sync Error:', error);
                        setLoading(false);
                        return;
                    }

                    if (statusData && statusData.length > 0) {
                        const processedRemote = await processStatuses(statusData, false);
                        
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
                        try {
                            const { useDbStore } = await import('@/store/useDbStore');
                            const { saveLocalStatus } = await import('@/lib/localDb');
                            const { db } = useDbStore.getState();
                            if (db) {
                                for (const s of statusData) {
                                    await saveLocalStatus(db, s);
                                }
                            }
                        } catch(e) {}
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
