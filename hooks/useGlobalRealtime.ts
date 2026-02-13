import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePushNotifications } from './usePushNotifications';
import { decryptText, getChatKey } from '@/utils/chatCrypto';

export const useGlobalRealtime = (userId: string | null) => {
    const { showLocalNotification } = usePushNotifications(userId);

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
    }, [userId]);
};
