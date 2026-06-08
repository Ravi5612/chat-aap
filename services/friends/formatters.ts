import { supabase } from '@/lib/supabase';
import { getVisibleAvatar } from '@/utils/privacyHelper';
import { saveLocalProfile } from '@/lib/localDb';

export function calculateUnreadCounts(unreadData: any[], userGroupIds: Set<string>) {
    const unreadCountsMap: any = {};
    (unreadData || []).forEach((m: any) => {
        if (m.group_id) {
            if (userGroupIds.has(m.group_id)) unreadCountsMap[m.group_id] = (unreadCountsMap[m.group_id] || 0) + 1;
        } else {
            unreadCountsMap[m.sender_id] = (unreadCountsMap[m.sender_id] || 0) + 1;
        }
    });
    return unreadCountsMap;
}

export function calculateLastActivity(recentMsgsData: any[], userId: string) {
    const lastActivityMap: Record<string, string> = {};
    const recentChatUserIds = new Set<string>();
    (recentMsgsData || []).forEach((m: any) => {
        const chatId = m.group_id || (m.sender_id === userId ? m.receiver_id : m.sender_id);
        if (chatId) {
            if (!lastActivityMap[chatId]) lastActivityMap[chatId] = m.created_at;
            if (!m.group_id) recentChatUserIds.add(chatId);
        }
    });
    return { lastActivityMap, recentChatUserIds };
}

export async function fetchMissingProfiles(recentChatUserIds: Set<string>, friendIds: string[], userId: string) {
    const missingUserIds = Array.from(recentChatUserIds).filter(id => !friendIds.includes(id) && id !== userId);
    let missingProfiles: any[] = [];
    if (missingUserIds.length > 0) {
        const { data } = await supabase.from('profiles').select('id, username, email, phone, avatar_url, gender, is_online, show_email, show_phone, allow_screenshot, allow_status_download, dp_privacy, dp_selected_friends, hide_dp_in_search').in('id', missingUserIds);
        if (data) missingProfiles = data;
    }
    return missingProfiles;
}

export function formatFriendsList(
    friendships: any[],
    missingProfiles: any[],
    statusInfoMap: any,
    localConv: any[],
    unreadCountsMap: any,
    lastActivityMap: any,
    blockedIds: string[],
    userId: string,
    db: any
) {
    const allProfilesToFormat = [
        ...friendships.map((f: any) => ({ otherProfile: f.friend, f, isFriend: true })),
        ...missingProfiles.map(p => ({ otherProfile: p, f: {}, isFriend: false, isFormerChat: true }))
    ];

    const formattedFriends = allProfilesToFormat.map(({ otherProfile, f, isFriend, isFormerChat }: any) => {
        if (!otherProfile) return null;
        const sInfo = statusInfoMap[otherProfile.id] || { count: 0, viewedCount: 0 };
        const existingItem = localConv.find((i: any) => i.id === otherProfile.id);
        const isLocked = (f.is_locked === true) || (existingItem?.isLocked === true);
        const isFavorite = (f.is_favorite === true) || (existingItem?.isFavorite === true);
        const isArchived = (f.is_archived === true) || (existingItem?.isArchived === true);
        const isHidden = (f.is_hidden === true) || (existingItem?.isHidden === true);

        const isUnfriended = !isFriend && !isFormerChat;

        return {
            id: otherProfile.id,
            name: otherProfile.username || 'Unknown',
            email: otherProfile.show_email !== false ? otherProfile.email : null,
            phone: otherProfile.show_phone ? otherProfile.phone : null,
            img: getVisibleAvatar(otherProfile, userId, isFriend, false),
            gender: otherProfile?.gender,
            unreadCount: unreadCountsMap[otherProfile.id] || 0,
            statusCount: sInfo.count,
            allStatusesViewed: sInfo.count > 0 && sInfo.count === sInfo.viewedCount,
            db_is_online: otherProfile.is_online,
            lastActivity: lastActivityMap[otherProfile.id] || '0',
            isGroup: false,
            isFriend: isFriend,
            isUnfriended: isUnfriended,
            isFavorite: !!isFavorite,
            isArchived: !!isArchived,
            isBlocked: blockedIds.includes(otherProfile.id),
            isLocked: !!isLocked,
            isHidden: !!isHidden,
            disappearing_duration: f.disappearing_duration || 0,
            friend: {
                allow_screenshot: otherProfile.allow_screenshot,
                allow_status_download: otherProfile.allow_status_download
            }
        };
    }).filter(Boolean);

    if (db) {
        friendships.forEach((f: any) => {
            if (f.friend) saveLocalProfile(db, f.friend);
        });
    }

    return formattedFriends;
}

export function formatGroupsList(
    groupData: any[],
    localConv: any[],
    unreadCountsMap: any,
    lastActivityMap: any
) {
    return (groupData || []).filter((m: any) => m.groups).map((m: any) => {
        const existingItem = localConv.find((i: any) => i.id === m.groups.id);
        return {
            id: m.groups.id,
            name: m.groups.name,
            img: m.groups.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.groups.name)}&backgroundColor=F68537`,
            unreadCount: unreadCountsMap[m.groups.id] || 0,
            isGroup: true,
            isFavorite: existingItem?.isFavorite || false,
            isArchived: existingItem?.isArchived || false,
            isLocked: existingItem?.isLocked || false,
            isHidden: m.is_hidden === true || existingItem?.isHidden === true,
            disappearing_duration: 0,
            lastActivity: lastActivityMap[m.groups.id] || '0',
            statusCount: 0
        };
    });
}
