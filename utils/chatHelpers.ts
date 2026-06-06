import { decryptText, getDecryptedSenderKey, getLegacyGroupKey } from '@/utils/chatCrypto';
import { getLocallyDeletedMessages } from '@/lib/localDb';

export const decryptMessageBatch = async (messages: any[], chatKey: Uint8Array | null, myId?: string) => {
    return Promise.all((messages || []).map(async (msg) => {
        try {
            let activeKey = chatKey;
            let isLegacyFallback = false;

            // Sender Key logic for Group Chats
            if (msg.group_id && myId) {
                if (!msg.key_version) {
                    // Migration Dual-Mode: Old messages without key_version use legacy PBKDF2
                    activeKey = await getLegacyGroupKey(msg.group_id);
                    isLegacyFallback = true;
                } else {
                    const senderKey = await getDecryptedSenderKey(msg.group_id, msg.sender_id, myId, msg.key_version);
                    if (senderKey) {
                        activeKey = senderKey;
                    } else {
                        // Decryption Fallback Queue state (UI handles this gracefully)
                        return { ...msg, message: '⏳ Decrypting...', is_decrypting: true, file_url: null };
                    }
                }
            }

            if (!activeKey) return { ...msg };

            let decryptionError = false;
            let decryptedText = msg.message;
            if (msg.message && typeof msg.message === 'string') {
                const trimmed = msg.message.trim();
                if (trimmed.startsWith('{') && trimmed.includes('"iv"') && trimmed.includes('"content"')) {
                    try {
                        decryptedText = await decryptText(msg.message, activeKey);
                    } catch (e) {
                        decryptionError = true;
                    }
                }
            }

            // Dual-Mode Migration Fallback: If Sender Key failed, try legacy PBKDF2 (for messages sent during migration)
            if (decryptionError && !isLegacyFallback && msg.group_id) {
                try {
                    const fallbackKey = await getLegacyGroupKey(msg.group_id);
                    decryptedText = await decryptText(msg.message, fallbackKey);
                    activeKey = fallbackKey; // Use this key for the rest of the message
                    decryptionError = false;
                } catch (fallbackErr) {}
            }

            if (decryptionError) {
                return { ...msg, message: '⚠️ Decryption failed', file_url: null };
            }

            let decryptedReply = null;
            if (msg.reply && msg.reply.id) {
                try {
                    const replyText = await decryptText(msg.reply.message, activeKey);
                    decryptedReply = { ...msg.reply, message: replyText };
                } catch (e) {
                    decryptedReply = { ...msg.reply, message: msg.reply.message };
                }
            }

            let decryptedFileUrl = msg.file_url;
            if (msg.file_url && msg.file_url.trim().startsWith('{')) {
                try {
                    decryptedFileUrl = await decryptText(msg.file_url, activeKey);
                } catch (e) {
                    decryptedFileUrl = msg.file_url;
                }
            }

            return { 
                ...msg, 
                message: decryptedText, 
                reply: decryptedReply, 
                file_url: decryptedFileUrl,
                decryptionKeyBase64: Buffer.from(activeKey).toString('base64')
            };
        } catch (e) {
            return { ...msg }; // Original message as-is on error
        }
    }));
};

export const filterDeletedMessages = async (db: any, messages: any[]) => {
    try {
        const localDeletedIds = db ? await getLocallyDeletedMessages(db) : [];
        if (localDeletedIds && localDeletedIds.length > 0) {
            return messages.filter(m => m && m.id && !localDeletedIds.includes(m.id));
        }
    } catch (e) {
        console.warn('[chatHelpers] Local filter failed:', e);
    }
    return messages;
};
