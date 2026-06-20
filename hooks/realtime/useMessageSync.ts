import { useEffect, MutableRefObject } from 'react';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/store/useChatStore';
import { markMessageDeliveredLocally } from '@/lib/localDb';
import { useDbStore } from '@/store/useDbStore';
import { queueDeliveredUpdate } from '@/services/realtime/messageDeliveryService';
import { playMessageSound } from '@/services/realtime/notificationAudioService';
import { useFriendsStore } from '@/store/useFriendsStore';
import { getChatKey, decryptText } from '@/utils/chatCrypto';
import { decryptFileBase64 } from '@/utils/uploadHelper';
import * as FileSystem from 'expo-file-system';
import { saveMediaCache } from '@/lib/localDb';
import { Buffer } from 'buffer';

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

                try {
                    // 1. Decrypt text content first to check for media markers
                    let content = payload.new.message || '';
                    const chatKey = await getChatKey(userId, payload.new.sender_id);
                    let isEncrypted = false;
                    
                    if (chatKey && content.startsWith('{"iv":')) {
                        try {
                            content = await decryptText(content, chatKey);
                            isEncrypted = true;
                        } catch (e) {
                            if (__DEV__) console.warn('[DEBUG] GlobalRealtime: Decryption failed');
                        }
                    }

                    // 2. Check if it's a media message
                    const hasMedia = payload.new.file_url || 
                        content.includes('[Image]') || 
                        content.includes('[Video]') || 
                        content.includes('[Voice Message]') || 
                        content.includes('[Document]');

                    // 3. Mark delivered logic
                    const markDelivered = async () => {
                        const { db } = useDbStore.getState();
                        if (db) {
                            await markMessageDeliveredLocally(db, payload.new.id).catch(() => {});
                        }
                        queueDeliveredUpdate(payload.new.id);
                    };

                    if (!hasMedia) {
                        // Text message: Mark delivered immediately
                        await markDelivered();
                    } else {
                        // Media message: Background auto-download & decrypt, THEN mark delivered
                        (async () => {
                            try {
                                const { db } = useDbStore.getState();
                                let mediaUrl = payload.new.file_url;
                                
                                // Extract URL from E2EE text markers
                                if (!mediaUrl) {
                                    if (content.startsWith('[Image]')) mediaUrl = content.split(' ')[1];
                                    else if (content.startsWith('[Video]')) mediaUrl = content.split(' ')[1];
                                    else if (content.startsWith('[Voice Message]')) mediaUrl = content.split(' ')[2];
                                    else if (content.startsWith('[Document]')) mediaUrl = content.substring(11).split('|')[0]?.trim();
                                }

                                if (mediaUrl) {
                                    // Parse potential JSON payload in URL
                                    let actualUrl = mediaUrl;
                                    let mediaKey = null;
                                    if (mediaUrl.startsWith('{')) {
                                        try {
                                            const payloadObj = JSON.parse(mediaUrl);
                                            actualUrl = payloadObj.url;
                                            if (payloadObj.mediaKey) mediaKey = new Uint8Array(Buffer.from(payloadObj.mediaKey, 'base64'));
                                        } catch(e) {}
                                    }

                                    const decryptKey = mediaKey || (payload.new.decryptionKeyBase64 ? new Uint8Array(Buffer.from(payload.new.decryptionKeyBase64, 'base64')) : null) || chatKey;
                                    const filename = actualUrl.split('/').pop() || 'media.bin';
                                    const isE2EE = !!mediaKey || actualUrl.includes('.txt');
                                    
                                    let ext = '.bin';
                                    if (content.includes('[Image]')) ext = '.jpg';
                                    if (content.includes('[Video]')) ext = '.mp4';
                                    if (content.includes('[Voice Message]')) ext = '.m4a';
                                    
                                    const localFileName = isE2EE ? filename.replace('.e2ee.txt', ext).replace('.txt', ext).replace('.bin', ext) : filename;
                                    const localUri = `${FileSystem.cacheDirectory}${localFileName}`;

                                    if (isE2EE && decryptKey) {
                                        const response = await fetch(actualUrl);
                                        const encryptedText = await response.text();
                                        const base64 = await decryptFileBase64(encryptedText, decryptKey);
                                        await FileSystem.writeAsStringAsync(localUri, base64, { encoding: FileSystem.EncodingType.Base64 });
                                        if (db) await saveMediaCache(db, mediaUrl, localUri, 'media');
                                    } else if (!isE2EE) {
                                        const download = await FileSystem.downloadAsync(actualUrl, localUri);
                                        if (download.status === 200 && db) {
                                            await saveMediaCache(db, mediaUrl, download.uri, 'media');
                                        }
                                    }
                                }
                            } catch (err) {
                                console.error('[ERROR] Auto-download failed:', err);
                            } finally {
                                // Mark as delivered even if download failed, so sender isn't permanently stuck on single tick
                                await markDelivered();
                            }
                        })();
                    }

                    await playMessageSound(profileRef.current?.message_tone);

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
