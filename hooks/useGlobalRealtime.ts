import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useMessageSync } from './realtime/useMessageSync';
import { usePresenceSync } from './realtime/usePresenceSync';
import { useStatusSync } from './realtime/useStatusSync';

export const useGlobalRealtime = (userId: string | null) => {
    const profile = useAuthStore(state => state.profile);

    // Use a ref for the latest profile to avoid re-subscribing too often
    // and to ensure the latest tone is used in the callback.
    const profileRef = useRef(profile);
    useEffect(() => {
        profileRef.current = profile;
    }, [profile]);

    useMessageSync(userId, profileRef);
    usePresenceSync(userId);
    useStatusSync(userId);
};
