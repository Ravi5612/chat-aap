import { useEffect } from 'react';
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

        console.log('[DEBUG] GlobalRealtime: Initializing messages channel for:', userId);

        const msgChannel = supabase
            .channel(`global-messages-${userId}`)
            .on(
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
            )
            .subscribe((status) => {
                console.log('[DEBUG] GlobalRealtime: Status:', status);
            });

        return () => {
            console.log('[DEBUG] GlobalRealtime: Cleaning up...');
            supabase.removeChannel(msgChannel);
        };
    }, [userId, profile?.message_tone]);
};
