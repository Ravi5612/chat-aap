import { supabase } from '@/lib/supabase';
import { decryptText, getChatKey, decryptKeyWithSharedSecret } from '@/utils/chatCrypto';

export interface ProcessStatusParams {
    rawStatuses: any[];
    isLocal: boolean;
    currentUser: any;
    userId: string;
    isArchive?: string;
    date?: string;
}

export const processRawStatuses = async (params: ProcessStatusParams) => {
    const { rawStatuses, isLocal, currentUser, userId, isArchive, date } = params;
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

    // Get Profile (Try memory cache first to avoid network delay)
    let profile: any = null;
    try {
        const { useFriendsStore } = require('@/store/useFriendsStore');
        const friends = useFriendsStore.getState().combinedItems;
        const friendData = friends.find((f: any) => f.id === userId);
        if (friendData && friendData.friend) {
            profile = {
                username: friendData.name || friendData.friend.username,
                avatar_url: friendData.avatar || friendData.friend.avatar_url,
                public_key: friendData.friend.public_key
            };
        }
    } catch(e) {}

    if (!profile) {
        const { data } = await supabase
            .from('profiles')
            .select('username, avatar_url, public_key')
            .eq('id', userId)
            .single();
        profile = data;
    }

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

export const fetchLocalStatuses = async (userId: string) => {
    try {
        const { useDbStore } = await import('@/store/useDbStore');
        const { getLocalStatuses } = await import('@/lib/localDb');
        const { db } = useDbStore.getState();
        
        if (db) {
            const localStatuses = await getLocalStatuses(db);
            if (localStatuses && localStatuses.length > 0) {
                return localStatuses.filter((s: any) => 
                    s.user_id === userId && (s.is_deleted === 0 || s.is_deleted === false || s.is_deleted === '0')
                );
            }
        }
    } catch (localError) {
        console.error('[STATUS] Local Cache Read Error:', localError);
    }
    return [];
};

export const fetchRemoteStatusesQuery = (userId: string, isArchive?: string) => {
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

    return query.order('created_at', { ascending: true });
};

export const saveStatusesToLocalDb = async (statusData: any[]) => {
    try {
        const { useDbStore } = await import('@/store/useDbStore');
        const { saveLocalStatus } = await import('@/lib/localDb');
        const { db } = useDbStore.getState();
        if (db) {
            for (const s of statusData) {
                await saveLocalStatus(db, s);
            }
        }
    } catch(e) {
        console.error('Failed to save to local db', e);
    }
};
