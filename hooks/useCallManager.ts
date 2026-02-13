import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

export const useCallManager = (currentUser: any, combinedItems: any[]) => {
    const [callSession, setCallSession] = useState<any>(null);
    const callProcessed = useRef(false);

    useEffect(() => {
        if (!currentUser) return;

        const channel = supabase.channel(`calls:${currentUser.id}`);
        channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
            if (payload.type === 'offer') {
                const caller = combinedItems.find(f => f.id === payload.caller_id) || {
                    id: payload.caller_id,
                    name: "Incoming Call",
                    img: null
                };
                setCallSession({
                    status: 'incoming',
                    friend: caller,
                    type: payload.call_type,
                    offer: payload.sdp
                });
            }
        }).subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser, combinedItems]);

    const handleStartCall = (friend: any, type: 'audio' | 'video' = 'video', onlineUsers?: any) => {
        if (!friend) return;

        // In a real app, check if friend is online
        setCallSession({ status: 'outgoing', friend, type });
    };

    const setCallActive = () => {
        setCallSession((prev: any) => prev ? { ...prev, status: 'active' } : null);
    };

    const endCall = () => {
        setCallSession(null);
    };

    return {
        callSession,
        handleStartCall,
        setCallActive,
        endCall,
        callProcessed
    };
};
