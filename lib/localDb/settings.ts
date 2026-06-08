import * as SQLite from 'expo-sqlite';

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

export const saveLocalDraft = async (db: SQLite.SQLiteDatabase, chatId: string, content: string) => {
    try {
        if (!content || content.trim() === '') {
            await db.runAsync('DELETE FROM drafts WHERE chat_id = ?', [chatId]);
            return;
        }
        await db.runAsync(
            'INSERT OR REPLACE INTO drafts (chat_id, content, updated_at) VALUES (?, ?, ?)',
            [chatId, content, new Date().toISOString()]
        );
    } catch (error) {
        console.error('[ERROR] Failed to save local draft:', error);
    }
};

export const getLocalDraft = async (db: SQLite.SQLiteDatabase, chatId: string) => {
    try {
        const result = await db.getFirstAsync<any>(
            'SELECT content FROM drafts WHERE chat_id = ?',
            [chatId]
        );
        return result ? result.content : null;
    } catch (error) {
        console.error('[ERROR] Failed to get local draft:', error);
        return null;
    }
};
