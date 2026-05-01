import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Audio } from 'expo-av';
import { logErrorToDB } from '@/utils/errorLogger';
import { useCallStore } from '@/store/useCallStore';

const RINGTONE_URL = 'https://vgqasnzpnnmshclnshob.supabase.co/storage/v1/object/public/system/ringtone.mp3';

export const useCallManager = (currentUser: any, combinedItems: any[], isListener = true) => {
    const { callSession, setCallSession, setCallActive, endCall: endGlobalCall } = useCallStore();
    const soundRef = useRef<Audio.Sound | null>(null);
    const profile = currentUser;

    // Handle ringtone
    useEffect(() => {
        const manageRingtone = async () => {
            try {
                if (callSession?.status === 'incoming') {
                    const userCallTone = profile?.call_tone || RINGTONE_URL;
                    if (soundRef.current) {
                        await soundRef.current.unloadAsync();
                    }
                    const { sound } = await Audio.Sound.createAsync(
                        { uri: userCallTone },
                        { shouldPlay: true, isLooping: true }
                    );
                    soundRef.current = sound;
                } else {
                    if (soundRef.current) {
                        await soundRef.current.stopAsync();
                        await soundRef.current.unloadAsync();
                        soundRef.current = null;
                    }
                }
            } catch (error) {
                console.error('Error managing ringtone:', error);
            }
        };

        manageRingtone();
        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, [callSession?.status]);

    // Setup Global Realtime Listener for calls
    useEffect(() => {
        if (!currentUser?.id || !isListener) return;

        const channelName = `calls-signal-${currentUser.id}`;

        const channel = supabase.channel(channelName);

        channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
            if (payload.type === 'offer') {
                const caller = combinedItems.find(f => f.id === payload.caller_id) || { id: payload.caller_id, name: 'Unknown' };
                setCallSession({
                    status: 'incoming',
                    type: payload.call_type,
                    offer: payload.sdp,
                    friend: caller
                });
            } else if (payload.type === 'accepted') {
                setCallActive();
            } else if (payload.type === 'end') {
                setCallSession(null);
            }
        });

        channel.subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id, combinedItems]);

    const handleStartCall = (friend: any, type: 'audio' | 'video' = 'video') => {
        setCallSession({
            status: 'outgoing',
            type,
            friend
        });

        const signalChannelName = `calls-signal-${friend.id}`;
        const personalChannel = supabase.channel(signalChannelName);
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
                console.log('[DEBUG] CallManager: Offer broadcasted successfully');
                setTimeout(() => {
                    supabase.removeChannel(personalChannel);
                }, 5000);
            }
        });
    };

    const endCall = () => {
        console.log('[DEBUG] CallManager: Manual end call triggered');
        if (callSession?.friend?.id) {
            const signalChannelName = `calls-signal-${callSession.friend.id}`;
            const personalChannel = supabase.channel(signalChannelName);
            personalChannel.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    personalChannel.send({
                        type: 'broadcast',
                        event: 'signal',
                        payload: { type: 'end' }
                    });
                    setTimeout(() => supabase.removeChannel(personalChannel), 1000);
                }
            });
        }
        setCallSession(null);
    };

    return {
        callSession,
        handleStartCall,
        setCallActive,
        endCall
    };
};
