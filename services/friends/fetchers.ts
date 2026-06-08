import { supabase } from '@/lib/supabase';
import { getLocalConversations, getLocalBlocks, syncLocalBlocks, getLocalStatuses, pruneExpiredStatuses } from '@/lib/localDb';

export async function fetchBaseData(userId: string, existingItems: any[], db: any) {
    let localConv = existingItems;
    let localBlocked: string[] = [];

    // 1. Local Load First
    if (db && existingItems.length === 0) {
        const [lc, lb] = await Promise.all([
            getLocalConversations(db),
            getLocalBlocks(db, userId)
        ]);
        if (lc && lc.length > 0) localConv = lc;
        if (lb && lb.length > 0) localBlocked = lb;
    }

    // 2. Fetch Blocked Users & Friendships
    const [blockedRes, friendshipsRes] = await Promise.all([
        supabase.from('blocked_users').select('blocked_id').eq('blocker_id', userId),
        supabase.from('friendships').select('is_favorite, is_archived, is_locked, user_id, friend_id').or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    ]);
    if (friendshipsRes.error) console.error('[DEBUG] friendships error:', friendshipsRes.error);

    const blockedIds = blockedRes.data?.map(b => b.blocked_id) || localBlocked;
    if (db && blockedRes.data) {
        await syncLocalBlocks(db, userId, blockedIds);
    }

    const friendshipsData = friendshipsRes.data || [];
    const friendIdsMap = new Map();
    
    // Deduplicate and prioritize current user's preferences
    friendshipsData.forEach((f: any) => {
        if (f.user_id === userId) {
            friendIdsMap.set(f.friend_id, f);
        } else if (f.friend_id === userId && !friendIdsMap.has(f.user_id)) {
            friendIdsMap.set(f.user_id, f);
        }
    });

    const friendIds = Array.from(friendIdsMap.keys());
    const allRelevantIds = [userId, ...friendIds];

    return { localConv, blockedIds, friendIdsMap, friendIds, allRelevantIds };
}

export async function fetchParallelData(userId: string, friendIds: string[], allRelevantIds: string[], db: any) {
    if (db) {
        await getLocalStatuses(db);
        await pruneExpiredStatuses(db);
    }

    const nowIso = new Date().toISOString();
    const statusQuery = supabase.from('statuses')
        .select('id, user_id, content, media_type, media_url, thumbnail_url, background_color, expires_at, created_at, is_deleted, privacy_type, viewer_ids, encrypted_keys')
        .in('user_id', allRelevantIds)
        .gt('expires_at', nowIso)
        .eq('is_deleted', false);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
        friendProfilesRes, 
        groupRes, 
        statusRes, 
        viewsRes, 
        unreadRes, 
        recentMsgsRes, 
        myProfileRes, 
        myAllStatusesRes
    ] = await Promise.all([
        friendIds.length > 0 
            ? supabase.from('profiles').select('id, username, email, phone, avatar_url, gender, is_online, show_email, show_phone, allow_screenshot, allow_status_download, dp_privacy, dp_selected_friends, hide_dp_in_search, public_key').in('id', friendIds)
            : Promise.resolve({ data: null, error: null }),
        supabase.from('group_members').select('group_id, is_hidden, groups (id, name, avatar_url)').eq('user_id', userId).then(r => { if (r.error) { console.error('[DEBUG] group_members error:', r.error); return { data: [], error: r.error }; } return r; }),
        statusQuery,
        supabase.from('status_views').select('status_id').eq('viewer_id', userId),
        supabase.from('messages').select('sender_id, group_id').or(`receiver_id.eq.${userId}, group_id.not.is.null`).eq('is_read', false),
        supabase.from('messages').select('created_at, sender_id, receiver_id, group_id').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: false }).limit(200),
        supabase.from('profiles').select('public_key').eq('id', userId).single(),
        supabase.from('statuses').select('*').eq('user_id', userId).gt('created_at', sevenDaysAgo.toISOString()).order('created_at', { ascending: false })
    ]);

    if (friendProfilesRes.error) console.error('[DEBUG] friendProfilesRes error:', friendProfilesRes.error);
    if (groupRes.error) console.error('[DEBUG] group_members error (non-fatal):', groupRes.error);

    let filteredStatuses = statusRes.data || [];
    if (filteredStatuses.length > 0) {
        filteredStatuses = filteredStatuses.filter(s => {
            if (s.user_id === userId) return true;
            if (s.privacy_type === 'all' || !s.privacy_type) return true;
            if (s.privacy_type === 'selected' && s.viewer_ids?.includes(userId)) return true;
            return false;
        });
    }

    return {
        friendProfilesData: friendProfilesRes.data,
        groupData: groupRes.data,
        filteredStatuses,
        viewsData: viewsRes.data,
        unreadData: unreadRes.data,
        recentMsgsData: recentMsgsRes.data,
        myProfile: myProfileRes.data,
        myAllStatuses: myAllStatusesRes.data
    };
}
