import { saveToCache } from '@/lib/database';
import { saveLocalMessage, syncLedgerExpense } from '@/lib/localDb';
import { supabase } from '@/lib/supabase';
import { encryptText, getChatKey } from '@/utils/chatCrypto';
import { logErrorToDB } from '@/utils/errorLogger';
import { Alert } from 'react-native';
import { uploadChatMessageMediaWithProgress } from '../../utils/uploadHelper';
import { useDbStore } from '../useDbStore';
import { StoreGet, StoreSet } from './chatTypes';

export const createChatSendActions = (set: StoreSet, get: StoreGet) => ({
    sendMessage: async (text: string, friendId: string, currentUser: any, isGroup: boolean, replyToId?: string, messageType?: string) => {
        const { chatKey, activeChannel, messages } = get();
        if ((!text || !text.trim()) && !text.startsWith('[Voice Message]') && !text.startsWith('[Image]') && !text.startsWith('[Document]') && !friendId || !currentUser || !chatKey) return;

        const tempId = `temp-${Date.now()}`;
        let messageToEncrypt = text;
        let fileData: any = null;

        const replyMsgObj = replyToId ? messages.find(m => m.id === replyToId) : null;
        const replyObject = replyMsgObj ? {
            id: replyMsgObj.id,
            message: replyMsgObj.message,
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

        const updatedMessages = [...messages, tempMsg];
        set((state) => ({
            messages: updatedMessages,
            cache: { ...state.cache, [friendId]: { ...state.cache[friendId], messages: updatedMessages, key: chatKey } }
        }));

        const { db } = useDbStore.getState();
        if (db) {
            saveLocalMessage(db, tempMsg);
        }

        try {
            if (text.startsWith('[Voice Message]') || text.startsWith('[Image]') || text.startsWith('[Document]')) {
                const isVoice = text.startsWith('[Voice Message]');
                const isDoc = text.startsWith('[Document]');

                let localUri = '';
                let uploadType: 'image' | 'voice' | 'document' = 'image';
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
                        (percent) => {
                            set((state) => ({
                                uploadProgress: { ...state.uploadProgress, [tempId]: percent }
                            }));
                        },
                        originalName,
                        docMime,
                        chatKey
                    );
                    messageToEncrypt = `Sent ${fileData.name || (isVoice ? 'a voice message' : (isDoc ? 'a document' : 'an image'))}`;
                }
            }

            const encryptedText = await encryptText(messageToEncrypt, chatKey);
            const encryptedFileUrl = fileData?.url ? await encryptText(fileData.url, chatKey) : null;
            const insertData: any = {
                sender_id: currentUser.id,
                message: encryptedText,
                status: 'sent',
                is_read: false,
                reply_to_id: replyToId,
                file_url: encryptedFileUrl,
                file_name: fileData?.name || null,
                file_type: fileData?.type || null,
                file_size: fileData?.size || null,
                message_type: messageType || 'text'
            };
            if (isGroup) insertData.group_id = friendId;
            else insertData.receiver_id = friendId;

            const { data, error } = await supabase.from('messages').insert([insertData]).select().single();
            if (error) throw error;

            const finalMsg = { ...data, message: messageToEncrypt, reply: replyObject };
            set((state) => {
                const newMessages = state.messages.map(m => m.id === tempId ? finalMsg : m);
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

            // broadcast removed to save data

        } catch (error: any) {
            console.error("SendMessage Error:", error);
            logErrorToDB(error, 'ChatStore: Send Message', currentUser.id, currentUser.username);
        }
    },

    forwardMessage: async (messageText: string, friendIds: string[], currentUser: any) => {
        if (!currentUser) return;
        try {
            const promises = friendIds.map(async (fid) => {
                const fKey = await getChatKey(currentUser.id, fid, false);
                const encText = await encryptText(messageText, fKey);
                return supabase.from('messages').insert({
                    sender_id: currentUser.id,
                    receiver_id: fid,
                    message: encText,
                    status: 'sent',
                    is_read: false
                });
            });
            await Promise.all(promises);
        } catch (err) {
            Alert.alert('Error', 'Failed to forward message');
        }
    }
});
