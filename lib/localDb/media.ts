import * as SQLite from 'expo-sqlite';

export const saveMediaCache = async (db: SQLite.SQLiteDatabase, remoteUrl: string, localUri: string, fileType?: string, fileSize?: number) => {
    try {
        await db.runAsync(
            'INSERT OR REPLACE INTO media_cache (remote_url, local_uri, file_type, file_size, created_at) VALUES (?, ?, ?, ?, ?)',
            [remoteUrl, localUri, fileType || null, fileSize || null, new Date().toISOString()]
        );
    } catch (error) {
        console.error('[ERROR] Failed to save media cache:', error);
    }
};

export const getMediaCache = async (db: SQLite.SQLiteDatabase, remoteUrl: string) => {
    try {
        const result = await db.getFirstAsync<any>(
            'SELECT local_uri FROM media_cache WHERE remote_url = ?',
            [remoteUrl]
        );
        return result ? result.local_uri : null;
    } catch (error) {
        console.error('[ERROR] Failed to get media cache:', error);
        return null;
    }
};

export const clearAllMediaCache = async (db: SQLite.SQLiteDatabase) => {
    try {
        await db.runAsync('DELETE FROM media_cache');
    } catch (error) {
        console.error('[ERROR] Failed to clear media cache:', error);
    }
};
