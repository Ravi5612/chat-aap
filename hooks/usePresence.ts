import { useState } from 'react';
import { useFriendsStore } from '@/store/useFriendsStore';

/**
 * DEPRECATED: Use global presence from useFriendsStore instead.
 * This hook is now a shell to prevent 'cannot add callbacks after subscribe' crashes.
 */
export const usePresence = (myUserId?: string | null) => {
    // Return online users from the global store instead of subscribing again
    const onlineUsers = useFriendsStore(state => state.onlineUsers);

    const isUserOnline = (userId: string) => {
        return !!onlineUsers[userId];
    };

    return { onlineUsers, isUserOnline };
};
