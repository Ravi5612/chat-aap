import * as SQLite from 'expo-sqlite';

// Database version control
const DATABASE_NAME = 'chatwarriors.db';

export const initDatabase = async () => {
    try {
        const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

        // 1. Create Messages Table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY NOT NULL,
                sender_id TEXT NOT NULL,
                receiver_id TEXT,
                group_id TEXT,
                message TEXT,
                file_url TEXT,
                file_type TEXT,
                file_name TEXT,
                status TEXT,
                is_read INTEGER DEFAULT 0,
                reply_to_id TEXT,
                created_at TEXT NOT NULL,
                reactions TEXT
            );
        `);

        // 2. Create Conversations Table (for the main chat list)
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY NOT NULL,
                last_message TEXT,
                last_message_at TEXT,
                unread_count INTEGER DEFAULT 0,
                is_group INTEGER DEFAULT 0,
                name TEXT,
                avatar TEXT
            );
        `);

        // 3. Create Statuses Table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS statuses (
                id TEXT PRIMARY KEY NOT NULL,
                user_id TEXT NOT NULL,
                content TEXT,
                media_url TEXT,
                media_type TEXT,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL
            );
        `);

        // 4. Create Call Logs Table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS call_logs (
                id TEXT PRIMARY KEY NOT NULL,
                caller_id TEXT NOT NULL,
                receiver_id TEXT NOT NULL,
                call_type TEXT, -- 'audio' or 'video'
                status TEXT, -- 'incoming', 'outgoing', 'missed'
                duration INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            );
        `);

        // 5. Create Profiles Table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY NOT NULL,
                username TEXT,
                avatar_url TEXT,
                email TEXT,
                bio TEXT,
                last_seen TEXT
            );
        `);

        // 6. Create Group Details Table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS group_details (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT,
                avatar_url TEXT,
                description TEXT,
                members TEXT, -- JSON string of members
                created_at TEXT
            );
        `);

        // 7. Create App Settings Table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY NOT NULL,
                value TEXT
            );
        `);

        // 8. Create Wallpapers Table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS wallpapers (
                chat_id TEXT PRIMARY KEY NOT NULL,
                image_uri TEXT NOT NULL
            );
        `);

        console.log('[SUCCESS] Local DB Initialized');
        return db;
    } catch (error) {
        console.error('[ERROR] Local DB Initialization Failed:', error);
        throw error;
    }
};

// Helper functions for Messages
export const saveLocalMessage = async (db: SQLite.SQLiteDatabase, msg: any) => {
    try {
        await db.runAsync(
            `INSERT OR REPLACE INTO messages 
            (id, sender_id, receiver_id, group_id, message, file_url, file_type, file_name, status, is_read, reply_to_id, created_at, reactions) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                msg.reply_to_id || null,
                msg.created_at,
                JSON.stringify(msg.reactions || {})
            ]
        );
    } catch (error) {
        console.error('[ERROR] Failed to save local message:', error);
    }
};

export const getLocalMessages = async (db: SQLite.SQLiteDatabase, friendId: string, isGroup: boolean = false) => {
    try {
        const query = isGroup 
            ? 'SELECT * FROM messages WHERE group_id = ? ORDER BY created_at ASC'
            : 'SELECT * FROM messages WHERE (sender_id = ? OR receiver_id = ?) AND group_id IS NULL ORDER BY created_at ASC';
        
        const params = isGroup ? [friendId] : [friendId, friendId];
        const results = await db.getAllAsync<any>(query, params);
        
        return results.map(row => ({
            ...row,
            is_read: row.is_read === 1,
            reactions: JSON.parse(row.reactions || '{}')
        }));
    } catch (error) {
        console.error('[ERROR] Failed to get local messages:', error);
        return [];
    }
};

// Helper functions for Profiles
export const saveLocalProfile = async (db: SQLite.SQLiteDatabase, profile: any) => {
    try {
        await db.runAsync(
            `INSERT OR REPLACE INTO profiles (id, username, avatar_url, email, bio, last_seen) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [profile.id, profile.username, profile.avatar_url, profile.email, profile.bio || '', profile.last_seen || null]
        );
    } catch (error) {
        console.error('[ERROR] Failed to save local profile:', error);
    }
};

export const getLocalProfile = async (db: SQLite.SQLiteDatabase, userId: string) => {
    try {
        const result = await db.getFirstAsync<any>(
            'SELECT * FROM profiles WHERE id = ?',
            [userId]
        );
        return result;
    } catch (error) {
        console.error('[ERROR] Failed to get local profile:', error);
        return null;
    }
};

// Helper functions for Group Details
export const saveLocalGroupDetails = async (db: SQLite.SQLiteDatabase, group: any) => {
    try {
        await db.runAsync(
            `INSERT OR REPLACE INTO group_details (id, name, avatar_url, description, members, created_at) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [group.id, group.name, group.avatar_url, group.description || '', JSON.stringify(group.members || []), group.created_at]
        );
    } catch (error) {
        console.error('[ERROR] Failed to save local group details:', error);
    }
};

export const getLocalGroupDetails = async (db: SQLite.SQLiteDatabase, groupId: string) => {
    try {
        const result = await db.getFirstAsync<any>(
            'SELECT * FROM group_details WHERE id = ?',
            [groupId]
        );
        if (result) {
            return {
                ...result,
                members: JSON.parse(result.members || '[]')
            };
        }
        return null;
    } catch (error) {
        console.error('[ERROR] Failed to get local group details:', error);
        return null;
    }
};

// Helper functions for App Settings
export const saveAppSetting = async (db: SQLite.SQLiteDatabase, key: string, value: string) => {
    try {
        await db.runAsync(
            'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
            [key, value]
        );
    } catch (error) {
        console.error('[ERROR] Failed to save app setting:', error);
    }
};

export const getAppSetting = async (db: SQLite.SQLiteDatabase, key: string) => {
    try {
        const result = await db.getFirstAsync<any>(
            'SELECT value FROM app_settings WHERE key = ?',
            [key]
        );
        return result ? result.value : null;
    } catch (error) {
        console.error('[ERROR] Failed to get app setting:', error);
        return null;
    }
};

// Helper functions for Wallpapers
export const saveLocalWallpaper = async (db: SQLite.SQLiteDatabase, chatId: string, imageUri: string) => {
    try {
        await db.runAsync(
            'INSERT OR REPLACE INTO wallpapers (chat_id, image_uri) VALUES (?, ?)',
            [chatId, imageUri]
        );
    } catch (error) {
        console.error('[ERROR] Failed to save local wallpaper:', error);
    }
};

export const getLocalWallpaper = async (db: SQLite.SQLiteDatabase, chatId: string) => {
    try {
        const result = await db.getFirstAsync<any>(
            'SELECT image_uri FROM wallpapers WHERE chat_id = ?',
            [chatId]
        );
        return result ? result.image_uri : null;
    } catch (error) {
        console.error('[ERROR] Failed to get local wallpaper:', error);
        return null;
    }
};

// Helper functions for Status
export const saveLocalStatus = async (db: SQLite.SQLiteDatabase, status: any) => {
    try {
        const createdAt = new Date(status.created_at);
        const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString();

        await db.runAsync(
            `INSERT OR REPLACE INTO statuses (id, user_id, content, media_url, media_type, created_at, expires_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [status.id, status.user_id, status.content, status.media_url, status.media_type, status.created_at, expiresAt]
        );
    } catch (error) {
        console.error('[ERROR] Failed to save local status:', error);
    }
};

export const getLocalStatuses = async (db: SQLite.SQLiteDatabase) => {
    try {
        const now = new Date().toISOString();
        // Get non-expired statuses
        const results = await db.getAllAsync<any>(
            'SELECT * FROM statuses WHERE expires_at > ? ORDER BY created_at DESC',
            [now]
        );
        return results;
    } catch (error) {
        console.error('[ERROR] Failed to get local statuses:', error);
        return [];
    }
};

export const pruneExpiredStatuses = async (db: SQLite.SQLiteDatabase) => {
    try {
        const now = new Date().toISOString();
        await db.runAsync('DELETE FROM statuses WHERE expires_at <= ?', [now]);
    } catch (error) {
        console.error('[ERROR] Failed to prune statuses:', error);
    }
};

export const syncLocalStatuses = async (db: SQLite.SQLiteDatabase, activeStatusIds: string[], userId: string) => {
    try {
        if (activeStatusIds.length === 0) {
            // If no active statuses for this fetch, clear all for those users? 
            // Better to just delete by IDs that are NOT in the active list but belong to relevant users.
            return;
        }
        const placeholders = activeStatusIds.map(() => '?').join(',');
        await db.runAsync(
            `DELETE FROM statuses WHERE id NOT IN (${placeholders})`,
            activeStatusIds
        );
    } catch (error) {
        console.error('[ERROR] Failed to sync local statuses:', error);
    }
};

// Helper functions for Call Logs
export const saveLocalCallLog = async (db: SQLite.SQLiteDatabase, log: any) => {
    try {
        await db.runAsync(
            `INSERT OR REPLACE INTO call_logs (id, caller_id, receiver_id, call_type, status, duration, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [log.id, log.caller_id, log.receiver_id, log.call_type, log.status, log.duration || 0, log.created_at]
        );
    } catch (error) {
        console.error('[ERROR] Failed to save local call log:', error);
    }
};

export const getLocalCallLogs = async (db: SQLite.SQLiteDatabase, userId: string) => {
    try {
        const results = await db.getAllAsync<any>(
            'SELECT * FROM call_logs WHERE caller_id = ? OR receiver_id = ? ORDER BY created_at DESC',
            [userId, userId]
        );
        return results;
    } catch (error) {
        console.error('[ERROR] Failed to get local call logs:', error);
        return [];
    }
};

// Helper functions for Conversations (Chat List)
export const saveLocalConversation = async (db: SQLite.SQLiteDatabase, conv: any) => {
    try {
        await db.runAsync(
            `INSERT OR REPLACE INTO conversations (id, name, avatar, last_message, last_message_at, unread_count, is_group) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                conv.id,
                conv.name || 'Unknown',
                conv.img || null,
                conv.last_message || '',
                conv.lastActivity || '0',
                conv.unreadCount || 0,
                conv.isGroup ? 1 : 0
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
            img: row.avatar,
            unreadCount: row.unread_count,
            isGroup: row.is_group === 1,
            lastActivity: row.last_message_at
        }));
    } catch (error) {
        console.error('[ERROR] Failed to get local conversations:', error);
        return [];
    }
};

export const clearLocalChat = async (db: SQLite.SQLiteDatabase, friendId: string, isGroup: boolean = false) => {
    try {
        const query = isGroup 
            ? 'DELETE FROM messages WHERE group_id = ?'
            : 'DELETE FROM messages WHERE (sender_id = ? OR receiver_id = ?) AND group_id IS NULL';
        
        const params = isGroup ? [friendId] : [friendId, friendId];
        await db.runAsync(query, params);
    } catch (error) {
        console.error('[ERROR] Failed to clear local chat:', error);
    }
};
