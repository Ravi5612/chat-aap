import { useEffect, MutableRefObject } from 'react';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/store/useChatStore';
import { markMessageDeliveredLocally } from '@/lib/localDb';
import { useDbStore } from '@/store/useDbStore';
import { queueDeliveredUpdate } from '@/services/realtime/messageDeliveryService';
import { playMessageSound } from '@/services/realtime/notificationAudioService';
import { useFriendsStore } from '@/store/useFriendsStore';
import { getChatKey, decryptText } from '@/utils/chatCrypto';

export const useMessageSync = (userId: string | null, profileRef: MutableRefObject<any>) => {
    useEffect(() => {
        if (!userId) return;

        if (__DEV__) console.log('[DEBUG] GlobalRealtime: Initializing channels for:', userId);

        // 1. Message Sync Channel (Private to current user)
        const msgChannel = supabase.channel(`global-sync-${userId}`);

        msgChannel.on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${userId}`
            },
            async (payload) => {
                if (__DEV__) console.log('[DEBUG] GlobalRealtime: New private message arrived:', payload.new.id);

                // Check if user is currently inside this chat. If so, don't show global notification or sound.
                const { activeChatId } = useChatStore.getState();
                const isGroupMessage = !!payload.new.group_id;
                const activeIdToCheck = isGroupMessage ? payload.new.group_id : payload.new.sender_id;
                
                if (activeChatId === activeIdToCheck) {
                    return; // Skip global alerts, useChatRoom handles it
                }

                // Mark message as 'delivered' immediately
                const { db } = useDbStore.getState();
                if (db) {
                    await markMessageDeliveredLocally(db, payload.new.id).catch(() => {});
                }

                // Queue Supabase update for batching instead of calling it immediately 
                queueDeliveredUpdate(payload.new.id);

                await playMessageSound(profileRef.current?.message_tone);

                try {
                    // Fetch sender name from local cache instead of hitting Supabase
                    const { friends, groups } = useFriendsStore.getState();
                    let senderName = 'New Message';
                    
                    if (isGroupMessage) {
                        const group = groups.find(g => g.group.id === payload.new.group_id);
                        if (group) senderName = `New message in ${group.group.name}`;
                    } else {
                        const friend = friends.find(f => f.friend.id === payload.new.sender_id);
                        if (friend) senderName = friend.friend.username;
                    }

                    // Note: getChatKey is ALREADY cached in memory inside chatCrypto.ts 
                    const chatKey = await getChatKey(userId, payload.new.sender_id);
                    let content = '[Encrypted Message]';
                    try {
                        content = await decryptText(payload.new.message, chatKey);
                    } catch (e) {
                        if (__DEV__) console.warn('[DEBUG] GlobalRealtime: Decryption failed');
                    }

                } catch (err) {
                    if (__DEV__) console.error('[ERROR] GlobalRealtime Message Handler:', err);
                }
            }
        );

        msgChannel.subscribe((status) => {
            if (__DEV__) console.log('[DEBUG] GlobalRealtime MsgChannel Status:', status);
        });

        return () => {
            if (__DEV__) console.log('[DEBUG] GlobalRealtime: Cleaning up msg channels...');
            supabase.removeChannel(msgChannel);
        };
    }, [userId, profileRef]);
};
