import * as SQLite from 'expo-sqlite';

export const saveLocalConversation = async (db: SQLite.SQLiteDatabase, conv: any) => {
    try {
        await db.runAsync(
            `INSERT OR REPLACE INTO conversations (id, name, email, avatar, last_message, last_message_at, unread_count, is_group, is_locked, is_favorite, is_archived, is_unfriended, is_hidden) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                conv.id,
                conv.name || 'Unknown',
                conv.email || null,
                conv.img || null,
                conv.last_message || '',
                conv.lastActivity || '0',
                conv.unreadCount || 0,
                conv.isGroup ? 1 : 0,
                conv.isLocked ? 1 : 0,
                conv.isFavorite ? 1 : 0,
                conv.isArchived ? 1 : 0,
                conv.isUnfriended ? 1 : 0,
                conv.isHidden ? 1 : 0
            ]
        );
    } catch (error) {
        console.error('[ERROR] Failed to save local conversation:', error);
    }
};

export const getLocalConversations = async (db: SQLite.SQLiteDatabase) => {
    try {
        const results = await db.getAllAsync<any>(
            'SELECT * FROM conversations ORDER BY last_message_at DESC'
        );
        return results.map(row => ({
            ...row,
            email: row.email,
            img: row.avatar,
            unreadCount: row.unread_count,
            isGroup: row.is_group === 1,
            isLocked: row.is_locked === 1,
            isFavorite: row.is_favorite === 1,
            isArchived: row.is_archived === 1,
            isUnfriended: row.is_unfriended === 1,
            isHidden: row.is_hidden === 1,
            lastActivity: row.last_message_at
        }));
    } catch (error) {
        console.error('[ERROR] Failed to get local conversations:', error);
        return [];
    }
};

export const clearLocalChat = async (db: SQLite.SQLiteDatabase, friendId: string, isGroup: boolean = false) => {
    const query = isGroup 
        ? 'DELETE FROM messages WHERE group_id = ?'
        : 'DELETE FROM messages WHERE (sender_id = ? OR receiver_id = ?) AND group_id IS NULL';
    
    const params = isGroup ? [friendId] : [friendId, friendId];
    await db.runAsync(query, params);
};

export const saveChatClearTimestamp = async (db: SQLite.SQLiteDatabase, chatId: string, timestamp: string) => {
    await db.runAsync(
        'INSERT OR REPLACE INTO chat_settings (chat_id, last_cleared_at) VALUES (?, ?)',
        [chatId, timestamp]
    );
};

export const getChatClearTimestamp = async (db: SQLite.SQLiteDatabase, chatId: string) => {
    try {
        const result = await db.getFirstAsync<any>(
            'SELECT last_cleared_at FROM chat_settings WHERE chat_id = ?',
            [chatId]
        );
        return result ? result.last_cleared_at : null;
    } catch (error) {
        console.error('[ERROR] Failed to get chat clear timestamp:', error);
        return null;
    }
};
