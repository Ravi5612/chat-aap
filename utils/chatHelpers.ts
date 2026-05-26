import { decryptText } from '@/utils/chatCrypto';
import { getLocallyDeletedMessages } from '@/lib/localDb';

export const decryptMessageBatch = async (messages: any[], chatKey: Uint8Array | null) => {
    return Promise.all((messages || []).map(async (msg) => {
        try {
            let decryptedText = msg.message;
            if (msg.message && typeof msg.message === 'string') {
                const trimmed = msg.message.trim();
                if (trimmed.startsWith('{') && trimmed.includes('"iv"') && trimmed.includes('"content"')) {
                    decryptedText = await decryptText(msg.message, chatKey!);
                }
            }

            let decryptedReply = null;
            if (msg.reply && msg.reply.id) {
                try {
                    const replyText = await decryptText(msg.reply.message, chatKey!);
                    decryptedReply = { ...msg.reply, message: replyText };
                } catch (e) {
                    decryptedReply = { ...msg.reply, message: msg.reply.message };
                }
            }

            let decryptedFileUrl = msg.file_url;
            if (msg.file_url && msg.file_url.trim().startsWith('{')) {
                try {
                    decryptedFileUrl = await decryptText(msg.file_url, chatKey!);
                } catch (e) {
                    decryptedFileUrl = msg.file_url;
                }
            }

            return { ...msg, message: decryptedText, reply: decryptedReply, file_url: decryptedFileUrl };
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
