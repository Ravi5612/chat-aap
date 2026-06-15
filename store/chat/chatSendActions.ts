import { saveToCache } from '@/lib/database';
import { saveLocalMessage, syncLedgerExpense } from '@/lib/localDb';
import { saveMediaCache } from '@/lib/localDb/media';
import { supabase } from '@/lib/supabase';
import { encryptText, getChatKey, getOrCreateMySenderKey, distributeSenderKey } from '@/utils/chatCrypto';
import { logErrorToDB } from '@/utils/errorLogger';
import { Alert } from 'react-native';
import { uploadChatMessageMediaWithProgress } from '../../utils/uploadHelper';
import { useDbStore } from '../useDbStore';
import { StoreGet, StoreSet } from './chatTypes';

export const createChatSendActions = (set: StoreSet, get: StoreGet) => ({
    sendMessage: async (text: string, friendId: string, currentUser: any, isGroup: boolean, replyToId?: string, messageType?: string, disappearingDuration?: number, scheduledAt?: Date) => {
        const { chatKey, activeChannel, messages } = get();
        if ((!text || !text.trim()) && !text.startsWith('[Voice Message]') && !text.startsWith('[Image]') && !text.startsWith('[Document]') && !friendId || !currentUser || !chatKey) return;

        const tempId = `temp-${Date.now()}`;
        let messageToEncrypt = text;
        let fileData: any = null;

        const replyMsgObj = replyToId ? messages.find(m => m.id === replyToId) : null;
        const replyObject = replyMsgObj ? {
            id: replyMsgObj.id,
            message: replyMsgObj?.message,
            sender_id: replyMsgObj.sender_id,
            created_at: replyMsgObj.created_at
        } : null;

        const tempMsg: any = {
            id: tempId,
            message: text.startsWith('[Voice Message]') || text.startsWith('[Image]') || text.startsWith('[Document]') ? '' : text,
            sender_id: currentUser.id,
            receiver_id: isGroup ? null : friendId,
            group_id: isGroup ? friendId : null,
            status: 'pending',
            reply_to_id: replyToId,
            reply: replyObject,
            message_type: messageType || 'text',
            created_at: new Date().toISOString(),
            file_url: text.startsWith('[Voice Message]') ? text.split(' ')[2] : (text.startsWith('[Image]') ? text.split(' ')[1] : (text.startsWith('[Document]') ? text.split(' | ')[0].replace('[Document] ', '').trim() : null)),
            file_type: text.startsWith('[Voice Message]') ? 'audio/m4a' : (text.startsWith('[Image]') ? 'image/jpeg' : (text.startsWith('[Document]') ? text.split(' | ')[2].trim() : null)),
            file_name: text.startsWith('[Document]') ? text.split(' | ')[1].trim() : null
        };

        const updatedMessages = scheduledAt ? messages : [...messages, tempMsg];
        if (!scheduledAt) {
            set((state: any) => ({
                messages: [...(state.messages || []), tempMsg],
                cache: { ...state.cache, [friendId]: { messages: [...(state.messages || []), tempMsg], key: state.chatKey } }
            }));    
        }

        const { db } = useDbStore.getState();
        if (db) {
            saveLocalMessage(db, tempMsg);
        }

        try {
            let encryptKey = chatKey!;
            let keyVersion = 1;

            if (isGroup) {
                const { key, version } = await getOrCreateMySenderKey(friendId, currentUser.id);
                encryptKey = key;
                keyVersion = version;

                // Server-Coordinated Epoch check + Lazy Distribution
                try {
                    const [membersResponse, groupResponse] = await Promise.all([
                        supabase.from('group_members').select('user_id').eq('group_id', friendId),
                        supabase.from('groups').select('key_epoch').eq('id', friendId).single()
                    ]);

                    const members = membersResponse.data;
                    const serverEpoch = groupResponse.data?.key_epoch || 1;

                    if (members) {
                        const memberIds = members.map(m => m.user_id).filter(id => id !== currentUser.id);
                        
                        // Find who already has this specific version of the key
                        const { data: existingKeys } = await supabase.from('group_sender_keys')
                            .select('receiver_id')
                            .eq('group_id', friendId)
                            .eq('sender_id', currentUser.id)
                            .eq('key_version', version);
                            
                        const existingReceiverIds = existingKeys?.map(k => k.receiver_id) || [];
                        
                        // Check for Forward Secrecy Ratcheting:
                        const removedIds = existingReceiverIds.filter(id => !memberIds.includes(id));
                        
                        // Force Ratchet if server epoch advanced OR client diff detects removed member (failsafe)
                        if (version < serverEpoch || removedIds.length > 0) {
                            console.log(`Crypto: Key Ratcheting forced (Version ${version} < Epoch ${serverEpoch} OR Member Removed)`);
                            const rotated = await getOrCreateMySenderKey(friendId, currentUser.id, true); // forceRotate = true
                            encryptKey = rotated.key;
                            keyVersion = rotated.version;
                            
                            // Re-distribute the NEW key version to all currently valid members
                            await distributeSenderKey(friendId, currentUser.id, encryptKey, keyVersion, memberIds);
                        } else {
                            // Normal lazy distribution for new missing members (Sender-Key Reuse Optimization)
                            const missingIds = memberIds.filter(id => !existingReceiverIds.includes(id));
                            if (missingIds.length > 0) {
                                await distributeSenderKey(friendId, currentUser.id, encryptKey, version, missingIds);
                            }
                        }
                    }
                } catch (e) {
                    console.error("Crypto: Failed to distribute sender keys lazily", e);
                }
            }

            let localUri = '';
            let uploadType: 'image' | 'voice' | 'document' = 'image';

            if (text.startsWith('[Voice Message]') || text.startsWith('[Image]') || text.startsWith('[Document]')) {
                const isVoice = text.startsWith('[Voice Message]');
                const isDoc = text.startsWith('[Document]');

                let originalName = '';
                let docMime = '';

                if (isVoice) {
                    localUri = text.split(' ')[2];
                    uploadType = 'voice';
                } else if (isDoc) {
                    const parts = text.split(' | ');
                    localUri = parts[0].replace('[Document] ', '').trim();
                    originalName = parts[1].trim();
                    docMime = parts[2].trim();
                    uploadType = 'document';
                } else {
                    localUri = text.split(' ')[1];
                    uploadType = 'image';
                }

                if (localUri && (localUri.startsWith('file://') || localUri.startsWith('content://'))) {
                    fileData = await uploadChatMessageMediaWithProgress(
                        localUri,
                        uploadType,
                        currentUser.id,
                        (percent, timeLeftStr) => {
                            set((state: any) => ({
                                uploadProgress: { ...state.uploadProgress, [tempId]: { percent, timeLeftStr } }
                            }));
                        },
                        originalName,
                        docMime,
                        encryptKey
                    );
                    messageToEncrypt = `Sent ${fileData.name || (isVoice ? 'a voice message' : (isDoc ? 'a document' : 'an image'))}`;
                }
            }

            const encryptedText = await encryptText(messageToEncrypt, encryptKey);
            const encryptedFileUrl = fileData?.url ? await encryptText(fileData.url, encryptKey) : null;
            const insertData: any = {
                sender_id: currentUser.id,
                message: encryptedText,
                status: scheduledAt ? 'pending' : 'sent',
                file_url: encryptedFileUrl,
                file_name: fileData?.name || null,
                file_type: fileData?.type || null,
                file_size: fileData?.size || null,
                message_type: messageType || 'text',
                key_version: keyVersion,
            };
            
            if (!scheduledAt) {
                insertData.is_read = false;
                insertData.reply_to_id = replyToId;
                insertData.expires_at = disappearingDuration ? new Date(Date.now() + disappearingDuration * 1000).toISOString() : null;
            } else {
                insertData.scheduled_at = scheduledAt.toISOString();
            }

            if (isGroup) insertData.group_id = friendId;
            else insertData.receiver_id = friendId;

            const targetTable = scheduledAt ? 'scheduled_messages' : 'messages';
            const { data, error } = await supabase.from(targetTable).insert([insertData]).select().single();
            if (error) throw error;

            if (!scheduledAt) {
                const finalMsg = { 
                    ...data, 
                    message: messageToEncrypt, 
                    file_url: fileData?.url || null, // FIX 1: Pass the raw URL, not the encrypted JSON string
                    reply: replyObject, 
                    reply_to_id: replyToId 
                };

                // FIX 2: Cache the local file using the remote URL as the key, so we don't re-download what we just uploaded!
                if (fileData?.url && localUri && (localUri.startsWith('file://') || localUri.startsWith('content://'))) {
                    if (db) {
                        try {
                            await saveMediaCache(db, fileData.url, localUri, uploadType);
                        } catch (e) {
                            console.error('Failed to cache uploaded media:', e);
                        }
                    }
                }

                set((state: any) => {
                    const newMessages = state.messages.map((m: any) => m.id === tempId ? finalMsg : m);
                    saveToCache(`chat_messages_${friendId}`, { messages: newMessages });
                    const newProgress = { ...state.uploadProgress };
                    delete newProgress[tempId];
                    return {
                        messages: newMessages,
                        uploadProgress: newProgress,
                        cache: { ...state.cache, [friendId]: { ...state.cache[friendId], messages: newMessages, key: chatKey } }
                    };
                });

                if (db) {
                    try {
                        await db.runAsync('DELETE FROM messages WHERE id = ?', [tempId]);
                    } catch (e) {
                        console.warn('[DB] Failed to delete temp message:', e);
                    }
                    saveLocalMessage(db, finalMsg);
                    syncLedgerExpense(db, finalMsg, currentUser.id);
                }
            } else {
                // For scheduled messages, just clean up upload progress and notify success
                set((state: any) => {
                    const newProgress = { ...state.uploadProgress };
                    delete newProgress[tempId];
                    return { uploadProgress: newProgress };
                });
                require('react-native').Alert.alert('Success', 'Message scheduled successfully!');
            }

            // Guaranteed Push Notification delivery (invoking Edge Function manually as a fallback for missing webhooks)
            // The edge function has idempotency logic via push_logs, so it won't send duplicates if webhook also fires.
            try {
                if (!scheduledAt) {
                    await supabase.functions.invoke('expo-push', {
                        body: { type: 'INSERT', record: data }
                    });
                }
            } catch (invokeErr) {
                console.warn('[PUSH] Failed to invoke expo-push manually:', invokeErr);
            }

            // broadcast removed to save data

        } catch (error: any) {
            console.error("SendMessage Error:", error);
            
            // Show alert directly on screen to help debug
            const errMsg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
            Alert.alert(
                "Message Send Failed", 
                `Supabase Error: ${errMsg}\n\nPlease take a screenshot of this error.`
            );
            
            // ✅ MARK AS FAILED IN UI INSTEAD OF SPINNING FOREVER
            set((state: any) => {
                const newMessages = state.messages.map((m: any) => m.id === tempId ? { ...m, status: 'failed' } : m);
                const uniqueMessages = Array.from(new Map(newMessages.map((m: any) => [m.id, m])).values());
                saveToCache(`chat_messages_${friendId}`, { messages: uniqueMessages });
                
                return { 
                    messages: uniqueMessages, 
                    cache: { ...state.cache, [friendId]: { messages: uniqueMessages, key: state.chatKey } } 
                };
            });

            if (db) {
                db.runAsync('UPDATE messages SET status = ? WHERE id = ?', ['failed', tempId]).catch((e: any) => console.warn('[DB] Failed to update message to failed:', e));
            }

            logErrorToDB(error, 'ChatStore: Send Message', currentUser.id, currentUser.username);
        }
    },

    forwardMessage: async (messageText: string, friendIds: string[], currentUser: any) => {
        if (!currentUser) return;
        try {
            const promises = friendIds.map(async (fid) => {
                const fKey = await getChatKey(currentUser.id, fid, false);
                const encText = await encryptText(messageText, fKey!);
                const { data, error } = await supabase.from('messages').insert({
                    sender_id: currentUser.id,
                    receiver_id: fid,
                    message: encText,
                    status: 'sent',
                    is_read: false
                }).select().single();
                
                if (!error && data) {
                    supabase.functions.invoke('expo-push', {
                        body: { type: 'INSERT', record: data }
                    }).catch(e => console.warn('[PUSH] Forward push failed:', e));
                }
                return { data, error };
            });
            await Promise.all(promises);
        } catch (err) {
            Alert.alert('Error', 'Failed to forward message');
        }
    }
});
