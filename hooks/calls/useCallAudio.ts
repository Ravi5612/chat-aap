import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { Audio } from 'expo-av';

const RINGTONE_URL = 'https://vgqasnzpnnmshclnshob.supabase.co/storage/v1/object/public/system/ringtone.mp3';
import ringingTone from '../../assets/audio/ringing_tone.mp3';
const DIAL_TONE_URL = ringingTone;
import callingTone from '../../assets/audio/calling_tone.mp3';
const CALLING_TONE_URL = callingTone;

let isAudioModeConfigured = false;

export const useCallAudio = (callSession: any, profile: any) => {
    const soundRef = useRef<Audio.Sound | null>(null);

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
                            playThroughEarpieceAndroid: false,
                            shouldDuckAndroid: true,
                        });
                        isAudioModeConfigured = true;
                    }

                    const isIncoming = callSession.status === 'incoming';
                    const isRinging = callSession.status === 'ringing';
                    const toneUrl = isIncoming ? (profile?.call_tone || RINGTONE_URL) : 
                                   isRinging ? DIAL_TONE_URL : CALLING_TONE_URL;
                    const volume = isIncoming ? 1.0 : (isRinging ? 0.4 : 0.8); // louder for calling tone

                    if (__DEV__) console.log(`[DEBUG] CallManager: Playing tone:`, toneUrl);

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
                    // Stop tone when connected/ended
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

    return soundRef;
};
