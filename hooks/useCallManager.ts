import { useState, useEffect, useRef } from 'react';
import { AppState, Alert } from 'react-native';
import { useFriendsStore } from '@/store/useFriendsStore';
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
let isAudioModeConfigured = false;
import { displayOutgoingCall, cancelOutgoingCall, cancelIncomingCall } from '@/utils/notifeeCalling';

export const useCallManager = (currentUser: any, combinedItems: any[], isListener = true, profile: any = null) => {
    const { callSession, setCallSession, setCallActive, setCallEnded, endCall: endGlobalCall } = useCallStore();
    const soundRef = useRef<Audio.Sound | null>(null);
    const combinedItemsRef = useRef(combinedItems);

    useEffect(() => {
        combinedItemsRef.current = combinedItems;
    }, [combinedItems]);

    // Handle ringtone
    useEffect(() => {
        let isActive = true;

        const manageRingtone = async () => {
            try {
                if (callSession?.status === 'incoming' || callSession?.status === 'ringing' || callSession?.status === 'outgoing') {
                    // Set Audio Mode for Call only once per session or globally
                    if (!isAudioModeConfigured) {
                        await Audio.setAudioModeAsync({
                            playsInSilentModeIOS: true,
                            staysActiveInBackground: true,
                            shouldRouteThroughEarpieceAndroid: false,
                            shouldDuckAndroid: true,
                        });
                        isAudioModeConfigured = true;
                    }

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
                    if (soundRef.current) {
                        if (__DEV__) console.log('[DEBUG] CallManager: Stopping tone');
                        try {
                            const status = await soundRef.current.getStatusAsync();
                            if (status.isLoaded) {
                                await soundRef.current.stopAsync();
                                await soundRef.current.unloadAsync();
                            }
                        } catch (e) {
                            if (__DEV__) console.log('[DEBUG] CallManager: Tone stop error ignored', e);
                        } finally {
                            soundRef.current = null;
                        }
                    }
                }
            } catch (error) {
                if (__DEV__) console.error('[DEBUG] CallManager: Error in manageRingtone:', error);
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
                if (__DEV__) console.log('[DEBUG] CallManager: Outgoing call timed out (User unreachable)');
                setCallEnded('User is offline or unreachable');
            }, 30000);
        } else if (callSession?.status === 'ringing') {
            // Wait 60 seconds for them to answer. If not, it's a missed call.
            timeoutId = setTimeout(() => {
                if (__DEV__) console.log('[DEBUG] CallManager: Ringing call timed out (No answer)');
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

    // Helper function for reliable signaling without race conditions
    const sendSignalReliably = (targetId: string, payload: any) => {
        const channelName = `calls-signal-${targetId}`;
        const channel = supabase.channel(channelName);
        let timeoutId: NodeJS.Timeout;

        const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
            supabase.removeChannel(channel).catch(() => {});
        };

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                try {
                    await channel.send({
                        type: 'broadcast',
                        event: 'signal',
                        payload
                    });
                } catch (e) {
                    if (__DEV__) console.warn('[CALL_ACTION] Failed to send signal:', e);
                }
                cleanup(); // Clean up immediately after sending
            }
        });

        // Fail-safe cleanup after 8 seconds
        timeoutId = setTimeout(cleanup, 8000);
    };

    // Setup Global Realtime Listener for calls
    useEffect(() => {
        if (!currentUser?.id || !isListener) return;

        const channelName = `calls-signal-${currentUser.id}`;
        const channel = supabase.channel(channelName);

        channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
            if (__DEV__) console.log('[CALL_ACTION] Signal received:', payload.type, 'from:', payload.caller_id);
            if (payload.type === 'offer') {
                // If already in a call, send BUSY signal back to the caller
                if (sessionRef.current) {
                    if (__DEV__) console.log('[CALL_ACTION] Already in a call, sending BUSY to:', payload.caller_id);
                    sendSignalReliably(payload.caller_id, { type: 'busy', receiver_id: currentUser.id });
                    return;
                }

                // Use the ref to prevent stale closures and avoid recreating the channel
                const caller = combinedItemsRef.current.find((f: any) => f.id === (payload.is_group ? payload.group_id : payload.caller_id)) || { id: payload.caller_id, name: 'Unknown' };
                if (__DEV__) console.log('[CALL_ACTION] Incoming call offer from:', caller.name);
                setCallSession({
                    status: 'incoming',
                    type: payload.call_type,
                    offer: payload.sdp,
                    friend: caller,
                    isGroup: payload.is_group
                });

                // Immediately send back a 'ringing' signal so caller knows we got it
                sendSignalReliably(payload.caller_id, { type: 'ringing', receiver_id: currentUser.id });
            } else if (payload.type === 'ringing') {
                if (__DEV__) console.log('[CALL_ACTION] Remote user is ringing');
                useCallStore.getState().setCallRinging();
            } else if (payload.type === 'accepted') {
                if (__DEV__) console.log('[CALL_ACTION] Call accepted by remote user');
                setCallActive();
            } else if (payload.type === 'busy') {
                if (__DEV__) console.log('[CALL_ACTION] Remote user is busy');
                if (!sessionRef.current?.isGroup) {
                    setCallEnded('User is busy on another call');
                }
            } else if (payload.type === 'rejected') {
                if (__DEV__) console.log('[CALL_ACTION] Call rejected by remote user');
                if (!sessionRef.current?.isGroup) {
                    setCallEnded('Call declined');
                } else {
                    setCallSession(null);
                }
            } else if (payload.type === 'end') {
                if (__DEV__) console.log('[CALL_ACTION] Call ended by remote user signal');
                setCallSession(null);
            }
        });

        channel.subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id, isListener]); // Removed combinedItems to fix channel disconnecting bug!

    useEffect(() => {
        if (!callSession) {
            cancelOutgoingCall();
            cancelIncomingCall();
            return;
        }

        // If it's an outgoing call that was initiated by us
        if (['outgoing', 'ringing', 'active'].includes(callSession.status) && callSession.type !== 'incoming') {
            let statusText = 'Calling...';
            if (callSession.status === 'ringing') statusText = 'Ringing...';
            if (callSession.status === 'active') statusText = 'Active (0:00)';
            
            displayOutgoingCall(callSession.friend?.name || 'Someone', statusText, callSession.friend?.avatar_url);

            let interval: NodeJS.Timeout;
            if (callSession.status === 'active') {
                let seconds = 0;
                interval = setInterval(() => {
                    seconds++;
                    const m = Math.floor(seconds / 60);
                    const s = seconds % 60;
                    const timeStr = `${m}:${s.toString().padStart(2, '0')}`;
                    displayOutgoingCall(callSession.friend?.name || 'Someone', `Active (${timeStr})`, callSession.friend?.avatar_url);
                }, 1000);
            }

            return () => {
                if (interval) clearInterval(interval);
            };
        } else {
            // Cancel outgoing notification if it's incoming or ended
            cancelOutgoingCall();
        }
        
        // Ensure incoming call notification is cancelled when active or ended
        if (callSession.status === 'active' || callSession.status === 'ended') {
            cancelIncomingCall();
        }
    }, [callSession?.status, callSession?.friend?.name, callSession?.friend?.avatar_url]);

    const handleStartCall = async (friend: any, type: 'audio' | 'video' = 'video', isGroup: boolean = false) => {
        if (__DEV__) console.log('[CALL_ACTION] Starting call to:', friend.name, 'Type:', type, 'IsGroup:', isGroup);
        
        setCallSession({
            status: 'outgoing',
            type,
            friend,
            isGroup
        });

        const offerPayload = {
            type: 'offer',
            call_type: type,
            caller_id: currentUser.id,
            is_group: isGroup,
            group_id: isGroup ? friend.id : null
        };

        if (isGroup) {
            // Fetch group members from local store to alert them
            const { groups } = useFriendsStore.getState();
            const group = groups.find(g => g.group.id === friend.id);
            const members = group?.members || [];
            
            if (members.length > 0) {
                if (__DEV__) console.log(`[CALL_ACTION] Notifying ${members.length - 1} group members`);
                members.forEach(m => {
                    if (m.user_id !== currentUser.id) {
                        sendSignalReliably(m.user_id, offerPayload);
                        // Wake up the device via push notification
                        supabase.functions.invoke('call-signal', {
                            body: { 
                                recipient_id: m.user_id, 
                                caller_name: currentUser.username, 
                                channel_name: 'group' // Not strictly used for connection anymore, just for old compatibility
                            }
                        }).then(({ error }) => {
                            if (error) console.error("Signal Error", error.message);
                        });
                    }
                });
            }
        } else {
            sendSignalReliably(friend.id, offerPayload);
            // Wake up the device via push notification
            supabase.functions.invoke('call-signal', {
                body: { 
                    recipient_id: friend.id, 
                    caller_name: currentUser.username, 
                    channel_name: 'private'
                }
            }).then(({ data, error }) => {
                if (error) {
                    console.error("Push Server Error", JSON.stringify(error));
                }
            }).catch(e => {
                console.error("Push Catch Error", e.message);
            });
        }
    };

    const endCall = () => {
        if (__DEV__) console.log('[CALL_ACTION] Ending call locally');
        cancelOutgoingCall();
        const endType = callSession?.status === 'incoming' ? 'rejected' : 'end';
        if (callSession?.friend?.id) {
            sendSignalReliably(callSession.friend.id, { type: endType });
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
