import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePushNotifications } from './usePushNotifications';
import { decryptText, getChatKey } from '@/utils/chatCrypto';
import { Audio } from 'expo-av';
import { useAuthStore } from '@/store/useAuthStore';

const DEFAULT_MESSAGE_TONE = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export const useGlobalRealtime = (userId: string | null) => {
    const { showLocalNotification } = usePushNotifications(userId);
    const { profile } = useAuthStore();

    const playMessageSound = async () => {
        try {
            const soundUrl = profile?.message_tone || DEFAULT_MESSAGE_TONE;
            const { sound } = await Audio.Sound.createAsync(
                { uri: soundUrl },
                { shouldPlay: true }
            );
            // Auto unload after play
            sound.setOnPlaybackStatusUpdate((status: any) => {
                if (status.didJustFinish) sound.unloadAsync();
            });
        } catch (error) {
            console.error('Error playing message sound:', error);
        }
    };

    useEffect(() => {
        if (!userId) return;

        console.log('GlobalRealtime: Subscribing for user:', userId);

        const channel = supabase
            .channel(`global-messages:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${userId}`
                },
                async (payload) => {
                    console.log('GlobalRealtime: New message received:', payload.new.id);
                    
                    // Play notification sound
                    playMessageSound();

                    try {
                        // 1. Get sender profile
                        const { data: sender } = await supabase
                            .from('profiles')
                            .select('username')
                            .eq('id', payload.new.sender_id)
                            .single();

                        // 2. Decrypt message content
                        const chatKey = await getChatKey(userId, payload.new.sender_id);
                        let content = '[Encrypted Message]';
                        try {
                            content = await decryptText(payload.new.message, chatKey);
                        } catch (e) {
                            console.warn('GlobalRealtime: Decryption failed');
                        }

                        // 3. Show Local Notification
                        showLocalNotification(
                            sender?.username || 'New Message',
                            content,
                            { senderId: payload.new.sender_id, messageId: payload.new.id }
                        );
                    } catch (err) {
                        console.error('GlobalRealtime: Error handling notification:', err);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, profile?.message_tone]);
};
