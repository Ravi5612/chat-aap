import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { usePushNotifications } from './usePushNotifications';
import { decryptText, getChatKey } from '@/utils/chatCrypto';
import { Audio } from 'expo-av';
import { useAuthStore } from '@/store/useAuthStore';
import { useFriendsStore } from '@/store/useFriendsStore';

const DEFAULT_MESSAGE_TONE = 'https://raw.githubusercontent.com/Anshuman71/chat-app/master/client/src/assets/notification.mp3';

export const useGlobalRealtime = (userId: string | null) => {
    const { showLocalNotification } = usePushNotifications(userId);
    const { profile } = useAuthStore();
    const setOnlineUsers = useFriendsStore(state => state.setOnlineUsers);
    const setGlobalChannel = (channel: any) => useFriendsStore.setState({ globalChannel: channel });

    // Use a ref for the latest profile to avoid re-subscribing too often
    // and to ensure the latest tone is used in the callback.
    const profileRef = useRef(profile);
    useEffect(() => {
        profileRef.current = profile;
    }, [profile]);

    const playMessageSound = async () => {
        try {
            // Configure audio mode to ensure sound plays even if ringer is off (optional, based on UX)
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                shouldRouteThroughEarpieceAndroid: false,
            });

            const soundUrl = profileRef.current?.message_tone || DEFAULT_MESSAGE_TONE;
            console.log('[DEBUG] GlobalRealtime: Playing sound from:', soundUrl);

            const { sound } = await Audio.Sound.createAsync(
                { uri: soundUrl },
                { shouldPlay: true, volume: 1.0 }
            );

            sound.setOnPlaybackStatusUpdate((status: any) => {
                if (status.didJustFinish) {
                    sound.unloadAsync().catch(() => { });
                }
            });
        } catch (error) {
            console.error('[ERROR] GlobalRealtime: Error playing message sound:', error);
        }
    };

    useEffect(() => {
        if (!userId) return;

        console.log('[DEBUG] GlobalRealtime: Initializing channel for:', userId);

        const channel = supabase.channel(`global-sync-${userId}`);
        setGlobalChannel(channel);

        // 1. Listen for New Messages (Private)
        channel.on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${userId}`
            },
            async (payload) => {
                console.log('[DEBUG] GlobalRealtime: New private message arrived:', payload.new.id);

                // Play sound
                playMessageSound();

                try {
                    const { data: sender } = await supabase
                        .from('profiles')
                        .select('username')
                        .eq('id', payload.new.sender_id)
                        .single();

                    const chatKey = await getChatKey(userId, payload.new.sender_id);
                    let content = '[Encrypted Message]';
                    try {
                        content = await decryptText(payload.new.message, chatKey);
                    } catch (e) {
                        console.warn('[DEBUG] GlobalRealtime: Decryption failed');
                    }

                    showLocalNotification(
                        sender?.username || 'New Message',
                        content,
                        { senderId: payload.new.sender_id, messageId: payload.new.id }
                    );
                } catch (err) {
                    console.error('[ERROR] GlobalRealtime Message Handler:', err);
                }
            }
        );

        // 2. Presence Logic
        channel
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState();
                const onlineMap: Record<string, any> = {};

                Object.keys(newState).forEach((key) => {
                    const userPresence = newState[key] as any[];
                    if (userPresence && userPresence.length > 0) {
                        const pres = userPresence[0];
                        if (pres.userId) {
                            onlineMap[pres.userId] = pres;
                        }
                    }
                });

                setOnlineUsers(onlineMap);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                // console.log('[DEBUG] Presence: User joined:', newPresences);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                // console.log('[DEBUG] Presence: User left:', leftPresences);
            });

        // 3. Subscribe & Track
        channel.subscribe(async (status) => {
            console.log('[DEBUG] GlobalRealtime: Status:', status);
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    userId: userId,
                    online_at: new Date().toISOString(),
                });
            }
        });

        return () => {
            console.log('[DEBUG] GlobalRealtime: Cleaning up...');
            supabase.removeChannel(channel);
        };
    }, [userId]); // Only re-run if userId changes
};
