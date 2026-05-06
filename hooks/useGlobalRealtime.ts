import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { usePushNotifications } from './usePushNotifications';
import { decryptText, getChatKey } from '@/utils/chatCrypto';
import { Audio } from 'expo-av';
import { useAuthStore } from '@/store/useAuthStore';
import { useFriendsStore } from '@/store/useFriendsStore';

const DEFAULT_MESSAGE_TONE = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export const useGlobalRealtime = (userId: string | null) => {
    const { showLocalNotification } = usePushNotifications(userId);
    const { profile } = useAuthStore();
    const setOnlineUsers = useFriendsStore(state => state.setOnlineUsers);
    const lastPresenceSync = useRef<number>(0);

    const playMessageSound = async () => {
        try {
            const soundUrl = profile?.message_tone || DEFAULT_MESSAGE_TONE;
            const { sound } = await Audio.Sound.createAsync(
                { uri: soundUrl },
                { shouldPlay: true }
            );
            sound.setOnPlaybackStatusUpdate((status: any) => {
                if (status.didJustFinish) sound.unloadAsync();
            });
        } catch (error) {
            console.error('Error playing message sound:', error);
        }
    };

    useEffect(() => {
        if (!userId) return;

        console.log('[DEBUG] GlobalRealtime: Initializing channel for:', userId);

        const channel = supabase.channel(`global-sync-${userId}`);

        // 1. Listen for New Messages
        channel.on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${userId}`
            },
            async (payload) => {
                console.log('[DEBUG] GlobalRealtime: New message arrived:', payload.new.id);
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

                console.log('[DEBUG] Presence Map Updated:', Object.keys(onlineMap));
                setOnlineUsers(onlineMap);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                console.log('[DEBUG] Presence: User joined:', newPresences);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                console.log('[DEBUG] Presence: User left:', leftPresences);
            });

        // 3. Subscribe & Track
        channel.subscribe(async (status) => {
            console.log('[DEBUG] GlobalRealtime: Status:', status);
            if (status === 'SUBSCRIBED') {
                const trackStatus = await channel.track({
                    userId: userId,
                    online_at: new Date().toISOString(),
                });
                console.log('[DEBUG] Presence Tracking Status:', trackStatus);
            }
        });

        return () => {
            console.log('[DEBUG] GlobalRealtime: Cleaning up...');
            supabase.removeChannel(channel);
        };
    }, [userId, profile?.message_tone]);
};
