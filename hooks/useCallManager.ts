import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Audio } from 'expo-av';
import { logErrorToDB } from '@/utils/errorLogger';
import { useCallStore } from '@/store/useCallStore';

const RINGTONE_URL = 'https://vgqasnzpnnmshclnshob.supabase.co/storage/v1/object/public/system/ringtone.mp3';

export const useCallManager = (currentUser: any, combinedItems: any[], isListener = true, profile: any = null) => {
    const { callSession, setCallSession, setCallActive, endCall: endGlobalCall } = useCallStore();
    const soundRef = useRef<Audio.Sound | null>(null);

    // Handle ringtone
    useEffect(() => {
        const manageRingtone = async () => {
            try {
                if (callSession?.status === 'incoming') {
                    // Set Audio Mode for Call
                    await Audio.setAudioModeAsync({
                        playsInSilentModeIOS: true,
                        staysActiveInBackground: true,
                        shouldRouteThroughEarpieceAndroid: false,
                        shouldDuckAndroid: true,
                    });

                    const userCallTone = profile?.call_tone || RINGTONE_URL;
                    console.log('[DEBUG] CallManager: Playing ringtone:', userCallTone);

                    if (soundRef.current) {
                        await soundRef.current.unloadAsync();
                    }
                    const { sound } = await Audio.Sound.createAsync(
                        { uri: userCallTone },
                        { shouldPlay: true, isLooping: true, volume: 1.0 }
                    );
                    soundRef.current = sound;
                } else {
                    if (soundRef.current) {
                        console.log('[DEBUG] CallManager: Stopping ringtone');
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
                soundRef.current.unloadAsync().catch(() => {});
            }
        };
    }, [callSession?.status, profile?.call_tone]);

    // Setup Global Realtime Listener for calls
    useEffect(() => {
        if (!currentUser?.id || !isListener) return;

        const channelName = `calls-signal-${currentUser.id}`;

        const channel = supabase.channel(channelName);

        channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
            console.log('[CALL_ACTION] Signal received:', payload.type, 'from:', payload.caller_id);
            if (payload.type === 'offer') {
                // If already in a call, send BUSY signal back to the caller
                if (callSession) {
                    console.log('[CALL_ACTION] Already in a call, sending BUSY to:', payload.caller_id);
                    const busyChannel = supabase.channel(`calls-signal-${payload.caller_id}`);
                    busyChannel.subscribe((status) => {
                        if (status === 'SUBSCRIBED') {
                            busyChannel.send({
                                type: 'broadcast',
                                event: 'signal',
                                payload: { type: 'busy', receiver_id: currentUser.id }
                            });
                            setTimeout(() => supabase.removeChannel(busyChannel), 1000);
                        }
                    });
                    return;
                }

                const caller = combinedItems.find(f => f.id === (payload.is_group ? payload.group_id : payload.caller_id)) || { id: payload.caller_id, name: 'Unknown' };
                console.log('[CALL_ACTION] Incoming call offer from:', caller.name);
                setCallSession({
                    status: 'incoming',
                    type: payload.call_type,
                    offer: payload.sdp,
                    friend: caller,
                    isGroup: payload.is_group
                });
            } else if (payload.type === 'accepted') {
                console.log('[CALL_ACTION] Call accepted by remote user');
                setCallActive();
            } else if (payload.type === 'busy') {
                console.log('[CALL_ACTION] Remote user is busy');
                // Only show busy for 1-on-1 calls, for groups it's fine if some are busy
                if (!callSession?.isGroup) {
                    alert('User is busy on another call');
                    setCallSession(null);
                }
            } else if (payload.type === 'end') {
                console.log('[CALL_ACTION] Call ended by remote user signal');
                setCallSession(null);
            }
        });

        channel.subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id, combinedItems, callSession]);

    const handleStartCall = async (friend: any, type: 'audio' | 'video' = 'video', isGroup: boolean = false) => {
        console.log('[CALL_ACTION] Starting call to:', friend.name, 'Type:', type, 'IsGroup:', isGroup);
        
        setCallSession({
            status: 'outgoing',
            type,
            friend,
            isGroup
        });

        const sendSignal = (targetId: string) => {
            const signalChannelName = `calls-signal-${targetId}`;
            const personalChannel = supabase.channel(signalChannelName);
            personalChannel.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    personalChannel.send({
                        type: 'broadcast',
                        event: 'signal',
                        payload: {
                            type: 'offer',
                            call_type: type,
                            caller_id: currentUser.id,
                            is_group: isGroup,
                            group_id: isGroup ? friend.id : null
                        }
                    });
                    setTimeout(() => supabase.removeChannel(personalChannel), 5000);
                }
            });
        };

        if (isGroup) {
            // Fetch group members to alert them
            const { data: members, error } = await supabase
                .from('group_members')
                .select('user_id')
                .eq('group_id', friend.id)
                .neq('user_id', currentUser.id);

            if (!error && members) {
                console.log(`[CALL_ACTION] Notifying ${members.length} group members`);
                members.forEach(m => sendSignal(m.user_id));
            }
        } else {
            sendSignal(friend.id);
        }
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
