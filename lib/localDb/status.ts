import * as SQLite from 'expo-sqlite';

export const saveLocalStatus = async (db: SQLite.SQLiteDatabase, status: any) => {
    try {
        const createdAt = new Date(status.created_at);
        const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString();

        await db.runAsync(
            `INSERT OR REPLACE INTO statuses (id, user_id, content, media_url, media_type, created_at, expires_at, encrypted_keys, mentioned_user_ids, audio_url, thumbnail_url) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                status.id, 
                status.user_id, 
                status.content, 
                status.media_url, 
                status.media_type, 
                status.created_at, 
                expiresAt,
                status.encrypted_keys ? JSON.stringify(status.encrypted_keys) : null,
                status.mentioned_user_ids ? JSON.stringify(status.mentioned_user_ids) : null,
                status.audio_url,
                status.thumbnail_url
            ]
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
