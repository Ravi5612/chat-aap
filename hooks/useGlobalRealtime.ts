import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { showLocalNotification } from './usePushNotifications';
import { decryptText, getChatKey } from '@/utils/chatCrypto';
import { Audio } from 'expo-av';
import { useAuthStore } from '@/store/useAuthStore';
import { useFriendsStore } from '@/store/useFriendsStore';
import { useChatStore } from '@/store/useChatStore';
import { markMessageDeliveredLocally, batchMarkMessageDeliveredLocally } from '@/lib/localDb';
import { useDbStore } from '@/store/useDbStore';

const DEFAULT_MESSAGE_TONE = 'https://raw.githubusercontent.com/Anshuman71/chat-app/master/client/src/assets/notification.mp3';

let globalSoundInstance: Audio.Sound | null = null;
let globalSoundUrl: string | null = null; // ✅ Track loaded URL to reuse instance
let isAudioConfigured = false;

// Queue for batching Supabase 'delivered' updates
let deliveredUpdateQueue: string[] = [];
let deliveredUpdateTimer: NodeJS.Timeout | null = null;

const queueDeliveredUpdate = (messageId: string) => {
    deliveredUpdateQueue.push(messageId);
    if (deliveredUpdateTimer) clearTimeout(deliveredUpdateTimer);
    
    deliveredUpdateTimer = setTimeout(async () => {
        if (deliveredUpdateQueue.length === 0) return;
        const idsToUpdate = [...deliveredUpdateQueue];
        deliveredUpdateQueue = [];
        
        try {
            const { error } = await supabase
                .from('messages')
                .update({ status: 'delivered' })
                .in('id', idsToUpdate);
            
            if (error) throw error;
            if (__DEV__) console.log(`[DELIVERED] Batch updated ${idsToUpdate.length} messages in GlobalRealtime`);
        } catch (e) {
            if (__DEV__) console.warn('[DELIVERED] Batch update failed in GlobalRealtime:', e);
        }
    }, 1500); // Debounce for 1.5 seconds
};

export const useGlobalRealtime = (userId: string | null) => {
    const { profile } = useAuthStore();
    const setOnlineUsers = useFriendsStore(state => state.setOnlineUsers);

    // Use a ref for the latest profile to avoid re-subscribing too often
    // and to ensure the latest tone is used in the callback.
    const profileRef = useRef(profile);
    useEffect(() => {
        profileRef.current = profile;
    }, [profile]);

    const playMessageSound = async () => {
        try {
            // Configure audio mode only once
            if (!isAudioConfigured) {
                await Audio.setAudioModeAsync({
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: true,
                    shouldRouteThroughEarpieceAndroid: false,
                });
                isAudioConfigured = true;
            }

            const soundUrl = profileRef.current?.message_tone || DEFAULT_MESSAGE_TONE;

            // ✅ Reuse existing instance if same URL — avoids expensive createAsync on every message
            if (globalSoundInstance && globalSoundUrl === soundUrl) {
                await globalSoundInstance.setPositionAsync(0);
                await globalSoundInstance.playAsync();
                return;
            }

            // URL changed or first load — unload old, create new persistent instance
            if (globalSoundInstance) {
                await globalSoundInstance.unloadAsync().catch(() => {});
                globalSoundInstance = null;
                globalSoundUrl = null;
            }

            if (__DEV__) console.log('[DEBUG] GlobalRealtime: Loading sound:', soundUrl);
            const { sound } = await Audio.Sound.createAsync(
                { uri: soundUrl },
                { shouldPlay: true, volume: 1.0 }
            );

            globalSoundInstance = sound;
            globalSoundUrl = soundUrl;
        } catch (error) {
            if (__DEV__) console.error('[ERROR] GlobalRealtime: Error playing message sound:', error);
        }
    };

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

                await playMessageSound();

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

                    showLocalNotification(
                        senderName,
                        content,
                        { senderId: payload.new.sender_id, messageId: payload.new.id }
                    );
                } catch (err) {
                    if (__DEV__) console.error('[ERROR] GlobalRealtime Message Handler:', err);
                }
            }
        );

        msgChannel.subscribe((status) => {
            if (__DEV__) console.log('[DEBUG] GlobalRealtime MsgChannel Status:', status);
        });

        // 2. Shared Global Presence Channel (For real-time online status and typing sync)
        const presenceChannel = supabase.channel('global-presence');
        useFriendsStore.setState({ globalChannel: presenceChannel });

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const newState = presenceChannel.presenceState();
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

                if (__DEV__) console.log('[DEBUG] Presence sync updated. Online users count:', Object.keys(onlineMap).length);
                setOnlineUsers(onlineMap);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                // if (__DEV__) console.log('[DEBUG] Presence: User joined:', newPresences);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                // if (__DEV__) console.log('[DEBUG] Presence: User left:', leftPresences);
            });

        presenceChannel.subscribe(async (status) => {
            if (__DEV__) console.log('[DEBUG] GlobalRealtime PresenceChannel Status:', status);
            if (status === 'SUBSCRIBED') {
                await presenceChannel.track({
                    userId: userId,
                    online_at: new Date().toISOString(),
                });
            }
        });

        return () => {
            if (__DEV__) console.log('[DEBUG] GlobalRealtime: Cleaning up channels...');
            supabase.removeChannel(msgChannel);
            supabase.removeChannel(presenceChannel);
            useFriendsStore.setState({ globalChannel: null });
        };
    }, [userId]); // Only re-run if userId changes
};
