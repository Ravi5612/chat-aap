import { fetchBaseData, fetchParallelData } from './friends/fetchers';
import { processStatuses, processMyStatuses } from './friends/statusProcessor';
import { calculateUnreadCounts, calculateLastActivity, fetchMissingProfiles, formatFriendsList, formatGroupsList } from './friends/formatters';
import { saveLocalConversation } from '@/lib/localDb';

export async function fetchAndFormatFriendsData(
    userId: string,
    existingItems: any[],
    db: any,
    onlineUsers: Record<string, any>,
    currentUserId: string | undefined
) {
    // 1 & 2. Fetch base data (local + simple supabase)
    const { localConv, blockedIds, friendIdsMap, friendIds, allRelevantIds } = await fetchBaseData(userId, existingItems, db);

    // 3. Parallel fetch of most remote data
    const {
        friendProfilesData,
        groupData,
        filteredStatuses,
        viewsData,
        unreadData,
        recentMsgsData,
        myProfile,
        myAllStatuses
    } = await fetchParallelData(userId, friendIds, allRelevantIds, db);

    let friendships: any[] = [];
    if (friendProfilesData) {
        friendships = friendProfilesData.map((p: any) => {
            const f = friendIdsMap.get(p.id);
            return { ...f, friend: p };
        });
    }

    // Process Status Info
    const statusInfoMap = await processStatuses(filteredStatuses || [], viewsData || [], friendships, myProfile, userId, db);

    // Process Unread Counts
    const userGroupIds = new Set(groupData?.map((m: any) => m.group_id) || []);
    const unreadCountsMap = calculateUnreadCounts(unreadData || [], userGroupIds);

    // Process Last Activity
    const { lastActivityMap, recentChatUserIds } = calculateLastActivity(recentMsgsData || [], userId);

    // Find missing profiles
    const missingProfiles = await fetchMissingProfiles(recentChatUserIds, friendIds, userId);

    // Format Friends
    const formattedFriends = formatFriendsList(
        friendships, missingProfiles, statusInfoMap, localConv, unreadCountsMap, lastActivityMap, blockedIds, userId, db
    );

    // Format Groups
    const formattedGroups = formatGroupsList(groupData, localConv, unreadCountsMap, lastActivityMap);

    // My Statuses
    const groupedMyStatus = await processMyStatuses(myAllStatuses || [], myProfile, userId);

    const isConnected = currentUserId ? !!onlineUsers[currentUserId] : false;

    const combined = [...formattedFriends.map((f: any) => {
        const isOnline = isConnected ? !!onlineUsers[f.id] : f.db_is_online === true;
        return { 
            ...f, 
            isOnline,
            isTyping: onlineUsers[f.id]?.typingTo === currentUserId
        };
    }), ...formattedGroups];
    
    const sortedItems = Array.from(new Map(combined.map(item => [item.id, item])).values())
        .sort((a, b) => {
            const tA = new Date(a.lastActivity || 0).getTime() || 0;
            const tB = new Date(b.lastActivity || 0).getTime() || 0;
            return tB - tA;
        });

    if (db) {
        // Save the valid ones (excluding self) sequentially to avoid SQLite locks
        for (const item of sortedItems) {
            if (item.id !== userId) {
                await saveLocalConversation(db, item);
            }
        }
        
        // Ensure current user is never in the local conversations table
        try {
            await db.runAsync('DELETE FROM conversations WHERE id = ?', [userId]);
        } catch (e) {
            console.error('Failed to delete self from conversations', e);
        }
    }

    return {
        friends: formattedFriends,
        groups: formattedGroups,
        myStatuses: groupedMyStatus,
        statusInfo: statusInfoMap,
        combinedItems: sortedItems,
        lockedChatIds: sortedItems.filter(i => i.isLocked).map(i => i.id),
        blockedIds,
        localConv
    };
}
