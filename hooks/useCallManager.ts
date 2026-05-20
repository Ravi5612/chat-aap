import { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Audio } from 'expo-av';
import { logErrorToDB } from '@/utils/errorLogger';
import { useCallStore } from '@/store/useCallStore';
import { useNotificationStore } from '@/store/useNotificationStore';

const RINGTONE_URL = 'https://vgqasnzpnnmshclnshob.supabase.co/storage/v1/object/public/system/ringtone.mp3';
import ringingTone from '../assets/audio/ringing_tone.mp3';
const DIAL_TONE_URL = ringingTone;
import callingTone from '../assets/audio/calling_tone.mp3';
const CALLING_TONE_URL = callingTone;

export const useCallManager = (currentUser: any, combinedItems: any[], isListener = true, profile: any = null) => {
    const { callSession, setCallSession, setCallActive, setCallEnded, endCall: endGlobalCall } = useCallStore();
    const soundRef = useRef<Audio.Sound | null>(null);

    // Handle ringtone
    useEffect(() => {
        let isActive = true;

        const manageRingtone = async () => {
            try {
                if (callSession?.status === 'incoming' || callSession?.status === 'ringing' || callSession?.status === 'outgoing') {
                    // Set Audio Mode for Call
                    await Audio.setAudioModeAsync({
                        playsInSilentModeIOS: true,
                        staysActiveInBackground: true,
                        shouldRouteThroughEarpieceAndroid: false,
                        shouldDuckAndroid: true,
                    });

                    const isIncoming = callSession.status === 'incoming';
                    const isRinging = callSession.status === 'ringing';
                    const toneUrl = isIncoming ? (profile?.call_tone || RINGTONE_URL) : 
                                   isRinging ? DIAL_TONE_URL : CALLING_TONE_URL;
                    const volume = isIncoming ? 1.0 : (isRinging ? 0.4 : 0.8); // louder for calling tone

                    console.log(`[DEBUG] CallManager: Playing tone:`, toneUrl);

                    if (soundRef.current) {
                        await soundRef.current.unloadAsync();
                    }
                    
                    const source = typeof toneUrl === 'string' ? { uri: toneUrl } : toneUrl;
                    const { sound } = await Audio.Sound.createAsync(
                        source as any,
                        { shouldPlay: true, isLooping: true, volume }
                    );

                    if (!isActive) {
                        // If the effect was cleaned up while we were loading the sound, stop it immediately
                        await sound.stopAsync();
                        await sound.unloadAsync();
                        return;
                    }

                    soundRef.current = sound;
                } else {
                    if (soundRef.current) {
                        console.log('[DEBUG] CallManager: Stopping tone');
                        try {
                            const status = await soundRef.current.getStatusAsync();
                            if (status.isLoaded) {
                                await soundRef.current.stopAsync();
                                await soundRef.current.unloadAsync();
                            }
                        } catch (e) {
                            console.log('[DEBUG] CallManager: Tone stop error ignored', e);
                        } finally {
                            soundRef.current = null;
                        }
                    }
                }
            } catch (error) {
                console.error('[DEBUG] CallManager: Error in manageRingtone:', error);
            }
        };

        manageRingtone();
        
        return () => {
            isActive = false;
            // Also attempt to clean up if unmounting
            if (soundRef.current) {
                soundRef.current.unloadAsync().catch(() => {});
                soundRef.current = null;
            }
        };
    }, [callSession?.status, profile?.call_tone]);

    // Handle backgrounding during call setup
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'background' || nextAppState === 'inactive') {
                // Pause calling tone if user locks screen while dialing
                if (callSession?.status === 'outgoing' || callSession?.status === 'ringing') {
                    if (soundRef.current) {
                        soundRef.current.pauseAsync().catch(() => {});
                    }
                }
            } else if (nextAppState === 'active') {
                // Resume tone if we come back and it's still setting up
                if (callSession?.status === 'outgoing' || callSession?.status === 'ringing') {
                    if (soundRef.current) {
                        soundRef.current.playAsync().catch(() => {});
                    }
                }
            }
        });

        return () => {
            subscription.remove();
        };
    }, [callSession?.status]);

    // Handle call timeouts (Unreachable or Unanswered)
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        if (callSession?.status === 'outgoing') {
            // Wait 30 seconds for 'ringing' signal. If not received, they are offline.
            timeoutId = setTimeout(() => {
                console.log('[DEBUG] CallManager: Outgoing call timed out (User unreachable)');
                setCallEnded('User is offline or unreachable');
            }, 30000);
        } else if (callSession?.status === 'ringing') {
            // Wait 60 seconds for them to answer. If not, it's a missed call.
            timeoutId = setTimeout(() => {
                console.log('[DEBUG] CallManager: Ringing call timed out (No answer)');
                setCallEnded('Call unanswered');
            }, 60000);
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [callSession?.status]);

    const sessionRef = useRef(callSession);

    // Keep ref updated without triggering re-renders of the effect
    useEffect(() => {
        sessionRef.current = callSession;
    }, [callSession]);

    // Setup Global Realtime Listener for calls
    useEffect(() => {
        if (!currentUser?.id || !isListener) return;

        const channelName = `calls-signal-${currentUser.id}`;

        const channel = supabase.channel(channelName);

        channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
            console.log('[CALL_ACTION] Signal received:', payload.type, 'from:', payload.caller_id);
            if (payload.type === 'offer') {
                // If already in a call, send BUSY signal back to the caller
                if (sessionRef.current) {
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

                // Immediately send back a 'ringing' signal so caller knows we got it
                const ringingChannel = supabase.channel(`calls-signal-${payload.caller_id}`);
                ringingChannel.subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        ringingChannel.send({
                            type: 'broadcast',
                            event: 'signal',
                            payload: { type: 'ringing', receiver_id: currentUser.id }
                        });
                        setTimeout(() => supabase.removeChannel(ringingChannel).catch(() => {}), 1000);
                    }
                });
            } else if (payload.type === 'ringing') {
                console.log('[CALL_ACTION] Remote user is ringing');
                useCallStore.getState().setCallRinging();
            } else if (payload.type === 'accepted') {
                console.log('[CALL_ACTION] Call accepted by remote user');
                setCallActive();
            } else if (payload.type === 'busy') {
                console.log('[CALL_ACTION] Remote user is busy');
                if (!sessionRef.current?.isGroup) {
                    setCallEnded('User is busy on another call');
                }
            } else if (payload.type === 'rejected') {
                console.log('[CALL_ACTION] Call rejected by remote user');
                if (!sessionRef.current?.isGroup) {
                    setCallEnded('Call declined');
                } else {
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
    }, [currentUser?.id, combinedItems]); // Removed callSession to prevent unmounting!

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
        const endType = callSession?.status === 'incoming' ? 'rejected' : 'end';
        if (callSession?.friend?.id) {
            const signalChannelName = `calls-signal-${callSession.friend.id}`;
            const personalChannel = supabase.channel(signalChannelName);
            personalChannel.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    personalChannel.send({
                        type: 'broadcast',
                        event: 'signal',
                        payload: { type: endType }
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
