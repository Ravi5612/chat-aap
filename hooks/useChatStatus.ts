import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useFriendsStore } from '@/store/useFriendsStore';

export function useChatStatus(currentUser: any, safeFriendId: string, isGroup: boolean) {
    const onlineUsers = useFriendsStore(state => state.onlineUsers);
    const combinedItems = useFriendsStore(state => state.combinedItems);
    const blockedUserIds = useFriendsStore(state => state.blockedUserIds);
    
    const isBlocked = safeFriendId ? blockedUserIds.includes(safeFriendId) : false;
    const friendData = useMemo(() => (combinedItems || []).find(f => f?.id === safeFriendId), [combinedItems, safeFriendId]);
    
    const [iAmBlocked, setIAmBlocked] = useState(false);
    
    // Initialize from local state to avoid 4-5 second network delay for known friends
    const [isFriend, setIsFriend] = useState<boolean | null>(() => {
        if (isGroup) return true;
        const localFriend = (useFriendsStore.getState().combinedItems || []).find(f => f?.id === safeFriendId);
        if (localFriend && localFriend.isUnfriended !== undefined) {
            return !localFriend.isUnfriended;
        }
        return null;
    });

    const checkBlockStatus = useCallback(async () => {
        if (!currentUser || !safeFriendId || isGroup) return;
        const { data, error } = await supabase
            .from('blocked_users')
            .select('*')
            .eq('blocker_id', safeFriendId)
            .eq('blocked_id', currentUser.id)
            .maybeSingle();
        setIAmBlocked(!!data && !error);
    }, [currentUser, safeFriendId, isGroup]);

    const checkFriendshipStatus = useCallback(async () => {
        if (!currentUser || !safeFriendId || isGroup) {
            setIsFriend(true);
            return;
        }
        const { data } = await supabase
            .from('friendships')
            .select('id')
            .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${safeFriendId}),and(user_id.eq.${safeFriendId},friend_id.eq.${currentUser.id})`)
            .limit(1);
        setIsFriend(Array.isArray(data) && data.length > 0);
    }, [currentUser, safeFriendId, isGroup]);

    // Keep isFriend in sync with local friendData if it updates
    useEffect(() => {
        if (friendData && friendData.isUnfriended !== undefined) {
            setIsFriend(!friendData.isUnfriended);
        }
    }, [friendData]);

    useEffect(() => {
        checkBlockStatus();
        checkFriendshipStatus();
        
        const channel = supabase
            .channel(`block-status-${safeFriendId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'blocked_users' }, async () => {
                if (currentUser) await useFriendsStore.getState().fetchBlockedUsers(currentUser.id);
                checkBlockStatus();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
                checkFriendshipStatus();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [safeFriendId, checkBlockStatus, checkFriendshipStatus, currentUser]);

    
    
    const isUserOnline = useMemo(() => {
        if (!safeFriendId) return false;
        const isConnected = currentUser?.id ? !!onlineUsers[currentUser.id] : false;
        const isPresent = !!onlineUsers[safeFriendId];
        const isDbOnline = friendData?.db_is_online === true;
        return isConnected ? isPresent : isDbOnline;
    }, [onlineUsers, safeFriendId, friendData, currentUser]);

    return {
        isBlocked,
        iAmBlocked,
        isFriend,
        isUserOnline,
        friendData
    };
}
