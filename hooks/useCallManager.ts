import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Audio } from 'expo-av';
import { useAuthStore } from '@/store/useAuthStore';

const RINGTONE_URL = 'https://assets.mixkit.co/active_storage/sfx/135/135-preview.mp3';

export const useCallManager = (currentUser: any, combinedItems: any[]) => {
    const { profile } = useAuthStore();
    const [callSession, setCallSession] = useState<any>(null);
    const soundRef = useRef<Audio.Sound | null>(null);
    const callProcessed = useRef(false);

    // Handle ringtone
    useEffect(() => {
        const manageRingtone = async () => {
            if (callSession?.status === 'incoming') {
                const userCallTone = profile?.call_tone || RINGTONE_URL;
                try {
                    if (soundRef.current) {
                        await soundRef.current.unloadAsync();
                    }
                    const { sound } = await Audio.Sound.createAsync(
                        { uri: userCallTone },
                        { shouldPlay: true, isLooping: true }
                    );
                    soundRef.current = sound;
                } catch (error) {
                    console.error('Error playing ringtone:', error);
                }
            } else {
                if (soundRef.current) {
                    await soundRef.current.stopAsync();
                    await soundRef.current.unloadAsync();
                    soundRef.current = null;
                }
            }
        };

        manageRingtone();

        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, [callSession?.status]);

    useEffect(() => {
        if (!currentUser) return;

        const channel = supabase.channel(`calls:${currentUser.id}`);
        channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
            if (payload.type === 'offer') {
                const caller = combinedItems.find(f => f.id === payload.caller_id) || {
                    id: payload.caller_id,
                    name: "Incoming Call",
                    avatar_url: null
                };
                setCallSession({
                    status: 'incoming',
                    friend: caller,
                    type: payload.call_type,
                    offer: payload.sdp
                });
            } else if (payload.type === 'end') {
                setCallSession(null);
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
        if (callSession?.friend?.id) {
            const personalChannel = supabase.channel(`calls:${callSession.friend.id}`);
            personalChannel.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    personalChannel.send({
                        type: 'broadcast',
                        event: 'signal',
                        payload: { type: 'end' }
                    });
                    setTimeout(() => supabase.removeChannel(personalChannel), 2000);
                }
            });
        }
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
