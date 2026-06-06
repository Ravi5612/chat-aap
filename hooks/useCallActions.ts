import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useCallLogger } from '@/hooks/useCallLogger';
import { Audio } from 'expo-av';

export const useCallActions = (
    callState: string,
    callType: string,
    friend: any,
    currentUser: any,
    isGroup: boolean,
    endReason: string | undefined,
    onAcceptCall: () => void,
    onEndCall: () => void,
    onRetry?: () => void
) => {
    const router = useRouter();
    const [callDuration, setCallDuration] = useState(0);
    const startTimeRef = useRef<number | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastCallInfo = useRef({ state: callState, friend, type: callType, isGroup });
    const hasLogged = useRef(false);

    const { saveCallLog } = useCallLogger(currentUser, friend, callType, callState);

    // Keep memory of call info even when props become null
    useEffect(() => {
        if (callState && friend?.id) {
            lastCallInfo.current = { state: callState, friend, type: callType, isGroup };
        }
    }, [callState, friend?.id, callType, isGroup]);

    // Handle Ringing Sounds
    const soundRef = useRef<Audio.Sound | null>(null);

    useEffect(() => {
        let isMounted = true;

        const playSound = async () => {
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }
            try {
                let source = null;
                if (callState === 'outgoing' || callState === 'ringing') {
                    source = require('@/assets/sounds/ringing.mp3');
                } else if (callState === 'incoming') {
                    source = require('@/assets/sounds/ringtone.mp3');
                }

                if (source && isMounted) {
                    const { sound } = await Audio.Sound.createAsync(source, { isLooping: true });
                    soundRef.current = sound;
                    if (isMounted) {
                        await sound.playAsync();
                    } else {
                        await sound.unloadAsync();
                    }
                }
            } catch (e) {
                console.warn('Failed to play call sound', e);
            }
        };

        if (callState === 'outgoing' || callState === 'ringing' || callState === 'incoming') {
            playSound();
        } else {
            if (soundRef.current) {
                soundRef.current.stopAsync().then(() => {
                    soundRef.current?.unloadAsync();
                    soundRef.current = null;
                });
            }
        }

        return () => {
            isMounted = false;
            if (soundRef.current) {
                soundRef.current.stopAsync().then(() => {
                    soundRef.current?.unloadAsync();
                    soundRef.current = null;
                });
            }
        };
    }, [callState]);

    // Save call log on end
    useEffect(() => {
        if (callState === 'ended' && !hasLogged.current) {
            hasLogged.current = true;
            const status = (callDuration === 0 && endReason !== 'Call Ended') ? 'missed' : 'completed';
            saveCallLog(status, callDuration);
        }
    }, [callState, callDuration, saveCallLog, endReason]);

    // Call duration timer
    useEffect(() => {
        if (callState === 'active') {
            if (!startTimeRef.current) startTimeRef.current = Date.now();
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
                if (startTimeRef.current) {
                    setCallDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
                }
            }, 1000);
        } else {
            if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
            if (callState === 'outgoing' || callState === 'incoming') {
                startTimeRef.current = null;
                setCallDuration(0);
            }
        }
        return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
    }, [callState]);

    const acceptCall = useCallback(() => {
        onAcceptCall();
        const signalChannelName = `calls-signal-${friend.id}`;
        const personalChannel = supabase.channel(signalChannelName);
        personalChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                personalChannel.send({
                    type: 'broadcast',
                    event: 'signal',
                    payload: { type: 'accepted', caller_id: currentUser.id, is_group: isGroup, group_id: isGroup ? friend.id : null }
                });
                setTimeout(() => { supabase.removeChannel(personalChannel).catch(() => {}); }, 1000);
            }
        });
    }, [friend?.id, currentUser?.id, isGroup, onAcceptCall]);

    const endCall = useCallback(() => onEndCall(), [onEndCall]);

    const goToChat = useCallback(() => {
        onEndCall();
        setTimeout(() => {
            const nameParam = encodeURIComponent(friend.name || 'User');
            const groupParam = isGroup ? 'true' : 'false';
            router.push(`/chat/${friend.id}?name=${nameParam}&isGroup=${groupParam}`);
        }, 300);
    }, [friend?.id, friend?.name, isGroup, onEndCall, router]);

    const retryCall = useCallback(() => {
        if (onRetry) onRetry();
        else onEndCall();
    }, [onRetry, onEndCall]);

    return { callDuration, acceptCall, endCall, goToChat, retryCall };
};
