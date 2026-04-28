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

    const handleStartCall = (friend: any, type: 'audio' | 'video' = 'video') => {
        if (!friend || !currentUser) return;

        setCallSession({ status: 'outgoing', friend, type });

        // Signaling: Send ring event to the friend
        const personalChannel = supabase.channel(`calls:${friend.id}`);
        personalChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                personalChannel.send({
                    type: 'broadcast',
                    event: 'signal',
                    payload: {
                        type: 'offer',
                        call_type: type,
                        caller_id: currentUser.id
                    }
                });
                // Auto clean up after signaling
                setTimeout(() => supabase.removeChannel(personalChannel), 5000);
            }
        });
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
