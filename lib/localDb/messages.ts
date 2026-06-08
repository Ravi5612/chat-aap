import * as SQLite from 'expo-sqlite';
import { addLocalExpense } from './ledger';

export const saveLocalMessage = async (db: SQLite.SQLiteDatabase, msg: any) => {
    try {
        await db.runAsync(
            `INSERT OR REPLACE INTO messages 
            (id, sender_id, receiver_id, group_id, message, file_url, file_type, file_name, status, is_read, reply_to_id, created_at, reactions, message_type) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                msg.id,
                msg.sender_id,
                msg.receiver_id || null,
                msg.group_id || null,
                msg.message || '',
                msg.file_url || null,
                msg.file_type || null,
                msg.file_name || null,
                msg.status || 'sent',
                msg.is_read ? 1 : 0,
                msg.reply_to_id || msg.reply?.id || null,
                msg.created_at,
                JSON.stringify(msg.reactions || {}),
                msg.message_type || 'text'
            ]
        );

        // Automatically process Ledger Sync if message is type 'ledger'
        if (msg.message_type === 'ledger' && msg.message?.startsWith('SYSTEM_LEDGER:')) {
            try {
                const rawData = msg.message.replace('SYSTEM_LEDGER:', '');
                const ledgerData = JSON.parse(rawData);
                
                // Use useAuthStore to get current user ID
                const { useAuthStore } = require('@/store/useAuthStore');
                const currentUserId = useAuthStore.getState().user?.id;
                
                const isMe = msg.sender_id === currentUserId;
                const friendId = isMe ? msg.receiver_id : msg.sender_id;
                
                // Flip type ONLY if we are the receiver
                const finalType = isMe ? ledgerData.type : (ledgerData.type === 'gave' ? 'took' : 'gave');
                
                if (friendId) {
                    await addLocalExpense(
                        db, 
                        friendId, 
                        ledgerData.amount, 
                        ledgerData.description, 
                        finalType,
                        msg.id // Use message ID as sync_id
                    );
                    console.log(`[DB] Ledger sync successful. Type: ${finalType}, isMe: ${isMe}`);
                }
            } catch (e) {
                console.warn('[DB] Ledger auto-sync failed:', e);
            }
        }
    } catch (error) {
        console.error('[ERROR] Failed to save local message:', error);
    }
};

export const getLocalMessages = async (db: SQLite.SQLiteDatabase, friendId: string, isGroup: boolean = false, limit: number = 20, offset: number = 0) => {
    try {
        const { useAuthStore } = require('@/store/useAuthStore');
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) return [];

        const query = isGroup 
            ? `SELECT m.*, 
                      r.id as reply_id, r.message as reply_message, r.sender_id as reply_sender_id, r.file_url as reply_file_url, r.file_type as reply_file_type
               FROM messages m 
               LEFT JOIN messages r ON m.reply_to_id = r.id 
               WHERE m.group_id = ? 
               ORDER BY m.created_at DESC LIMIT ? OFFSET ?`
            : `SELECT m.*, 
                      r.id as reply_id, r.message as reply_message, r.sender_id as reply_sender_id, r.file_url as reply_file_url, r.file_type as reply_file_type
               FROM messages m 
               LEFT JOIN messages r ON m.reply_to_id = r.id 
               WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)) AND m.group_id IS NULL 
               ORDER BY m.created_at DESC LIMIT ? OFFSET ?`;
        
        const params = isGroup ? [friendId, limit, offset] : [currentUser.id, friendId, friendId, currentUser.id, limit, offset];
        const results = await db.getAllAsync<any>(query, params);
        
        return results.map(row => {
            let reply = null;
            if (row.reply_id) {
                reply = {
                    id: row.reply_id,
                    message: row.reply_message,
                    sender_id: row.reply_sender_id,
                    file_url: row.reply_file_url,
                    file_type: row.reply_file_type
                };
            }
            
            // Clean up the row object
            const { reply_id, reply_message, reply_sender_id, reply_file_url, reply_file_type, ...cleanRow } = row;
            
            return {
                ...cleanRow,
                is_read: cleanRow.is_read === 1,
                reactions: JSON.parse(cleanRow.reactions || '{}'),
                reply: reply
            };
        });
    } catch (error) {
        console.error('[ERROR] Failed to get local messages:', error);
        return [];
    }
};

export const markMessageAsDeletedLocally = async (db: SQLite.SQLiteDatabase, messageId: string) => {
    await db.runAsync('INSERT OR REPLACE INTO deleted_messages_me (message_id) VALUES (?)', [messageId]);
};

// Mark a message as 'delivered' in local DB
export const markMessageDeliveredLocally = async (db: SQLite.SQLiteDatabase, messageId: string) => {
    try {
        await db.runAsync(
            `UPDATE messages SET status = 'delivered' WHERE id = ? AND status = 'sent'`,
            [messageId]
        );
    } catch (error) {
        if (__DEV__) console.error('[ERROR] Failed to mark message delivered locally:', error);
    }
};

// Batch mark messages as 'delivered' in local DB
export const batchMarkMessageDeliveredLocally = async (db: SQLite.SQLiteDatabase, messageIds: string[]) => {
    try {
        if (!messageIds || messageIds.length === 0) return;
        const placeholders = messageIds.map(() => '?').join(',');
        await db.runAsync(
            `UPDATE messages SET status = 'delivered' WHERE id IN (${placeholders}) AND status = 'sent'`,
            messageIds
        );
    } catch (error) {
        if (__DEV__) console.error('[ERROR] Failed to batch mark messages delivered locally:', error);
    }
};

// Get all messages that need delivered sync (sent to me, status still 'sent')
export const getPendingDeliveredMessages = async (db: SQLite.SQLiteDatabase, myUserId: string) => {
    try {
        return await db.getAllAsync<any>(
            `SELECT id, sender_id FROM messages WHERE receiver_id = ? AND status = 'sent' AND group_id IS NULL`,
            [myUserId]
        );
    } catch (error) {
        console.error('[ERROR] Failed to get pending delivered messages:', error);
        return [];
    }
};

export const getLocallyDeletedMessages = async (db: SQLite.SQLiteDatabase) => {
    try {
        const results = await db.getAllAsync<any>('SELECT message_id FROM deleted_messages_me');
        return results.map(r => r.message_id);
    } catch (error) {
        console.error('[ERROR] Failed to get locally deleted messages:', error);
        return [];
    }
};
