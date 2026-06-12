import { decryptText, getChatKey, decryptKeyWithSharedSecret } from '@/utils/chatCrypto';
import { saveLocalStatus, syncLocalStatuses } from '@/lib/localDb';

export async function processStatuses(
    filteredStatuses: any[],
    viewsData: any[],
    friendships: any[],
    myProfile: any,
    userId: string,
    db: any
) {
    const viewedStatusIds = new Set(viewsData?.map((v: any) => v.status_id) || []);
    const statusInfoMap: Record<string, { count: number, viewedCount: number, thumbnail?: string, mediaType?: string, text?: string, bgColor?: string }> = {};

    const sortedStatuses = [...filteredStatuses].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const uniqueStatusUsers = [...new Set(sortedStatuses.map(s => s.user_id))];
    
    // Build a map of friend's public keys
    const friendPublicKeys: Record<string, string> = {};
    friendships.forEach((f: any) => {
        if (f.friend?.public_key) friendPublicKeys[f.friend.id] = f.friend.public_key;
    });

    if (myProfile?.public_key) {
        friendPublicKeys[userId] = myProfile.public_key;
    }

    const keyCache: Record<string, Uint8Array | null> = {};
    for (const uid of uniqueStatusUsers) {
        const latestStatus = sortedStatuses.find(s => s.user_id === uid);
        if (latestStatus && latestStatus.encrypted_keys && latestStatus.encrypted_keys[userId]) {
            const creatorPublicKey = friendPublicKeys[uid];
            if (creatorPublicKey) {
                try {
                    const statusKey = await decryptKeyWithSharedSecret(latestStatus.encrypted_keys[userId], creatorPublicKey, userId);
                    if (statusKey) {
                        keyCache[uid] = statusKey;
                    }
                } catch (e) {
                    console.error('Failed to decrypt status master key for', uid, e);
                }
            }
        }
        if (!keyCache[uid]) {
            try { keyCache[uid] = await getChatKey(userId, uid); } catch (e) { console.error('Failed to pre-fetch key for', uid, e); }
        }
    }

    for (const s of sortedStatuses) {
        if (!statusInfoMap[s.user_id]) {
            statusInfoMap[s.user_id] = { count: 0, viewedCount: 0 };
            if (s.thumbnail_url || s.media_url) {
                const targetUrl = s.thumbnail_url || s.media_url;
                if (targetUrl.trim().startsWith('{')) {
                    try {
                        const statusKey = keyCache[s.user_id];
                        if (statusKey) {
                            statusInfoMap[s.user_id].thumbnail = await decryptText(targetUrl, statusKey);
                            statusInfoMap[s.user_id].mediaType = s.media_type;
                        }
                    } catch (e) { console.error('Thumbnail decryption error:', e); }
                } else {
                    statusInfoMap[s.user_id].thumbnail = targetUrl;
                    statusInfoMap[s.user_id].mediaType = s.media_type;
                }
            } else if (s.media_type === 'text') {
                statusInfoMap[s.user_id].mediaType = 'text';
                statusInfoMap[s.user_id].bgColor = s.background_color;
                if (s.content && s.content.trim().startsWith('{')) {
                    try {
                        const statusKey = keyCache[s.user_id];
                        if (statusKey) {
                            statusInfoMap[s.user_id].text = await decryptText(s.content, statusKey);
                        }
                    } catch (e) { console.error('Text status decryption error:', e); }
                } else {
                    statusInfoMap[s.user_id].text = s.content;
                }
            }
        }
        statusInfoMap[s.user_id].count++;
        if (viewedStatusIds.has(s.id)) statusInfoMap[s.user_id].viewedCount++;
    }

    if (db && filteredStatuses) {
        const fetchedStatusIds = filteredStatuses.map(s => s.id);
        filteredStatuses.forEach(s => saveLocalStatus(db, s));
        await syncLocalStatuses(db, fetchedStatusIds, userId);
    }

    return statusInfoMap;
}

export async function processMyStatuses(
    myAllStatuses: any[],
    myProfile: any,
    userId: string
) {
    const decryptedMyStatuses = await Promise.all((myAllStatuses || []).map(async (s: any) => {
        let decryptedContent = s.content;
        let decryptedMediaUrl = s.media_url;
        let decryptedAudioUrl = s.audio_url;

        let statusKey = null;
        if (s.encrypted_keys && s.encrypted_keys[userId] && myProfile?.public_key) {
            statusKey = await decryptKeyWithSharedSecret(s.encrypted_keys[userId], myProfile.public_key, userId);
        }
        if (!statusKey) {
            statusKey = await getChatKey(userId, userId);
        }

        if (statusKey) {
            if (s.content && s.content.trim().startsWith('{')) {
                try {
                    decryptedContent = await decryptText(s.content, statusKey);
                } catch (e) { console.error('My status content decryption error:', e); }
            }
            if (s.media_url && s.media_url.trim().startsWith('{')) {
                try {
                    decryptedMediaUrl = await decryptText(s.media_url, statusKey);
                } catch (e) { console.error('My status media decryption error:', e); }
            }
            if (s.audio_url && s.audio_url.trim().startsWith('{')) {
                try {
                    decryptedAudioUrl = await decryptText(s.audio_url, statusKey);
                } catch (e) { console.error('My status audio decryption error:', e); }
            }
        }

        return { ...s, content: decryptedContent, media_url: decryptedMediaUrl, audio_url: decryptedAudioUrl, statusKey };
    }));

    const groupedMyStatus: any = { active: [] };
    const now = new Date();
    decryptedMyStatuses.forEach((status: any) => {
        const expiresAt = new Date(status.expires_at);
        if (expiresAt > now && !status.is_deleted) {
            groupedMyStatus.active.push(status);
        } else {
            const sDate = new Date(status.created_at);
            const diffDays = Math.floor((now.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));
            // Only keep history for the last 7 days
            if (diffDays <= 7) {
                let dateKey = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : sDate.toLocaleDateString('en-US', { weekday: 'long' });
                if (!groupedMyStatus[dateKey]) groupedMyStatus[dateKey] = [];
                groupedMyStatus[dateKey].push(status);
            }
        }
    });

    return groupedMyStatus;
}
