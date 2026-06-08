import * as SQLite from 'expo-sqlite';

export const saveLocalBlock = async (db: SQLite.SQLiteDatabase, blockerId: string, blockedId: string) => {
    try {
        await db.runAsync(
            'INSERT OR REPLACE INTO blocked_users (blocker_id, blocked_id) VALUES (?, ?)',
            [blockerId, blockedId]
        );
    } catch (error) {
        console.error('[ERROR] Failed to save local block:', error);
    }
};

export const deleteLocalBlock = async (db: SQLite.SQLiteDatabase, blockerId: string, blockedId: string) => {
    try {
        await db.runAsync(
            'DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?',
            [blockerId, blockedId]
        );
    } catch (error) {
        console.error('[ERROR] Failed to delete local block:', error);
    }
};

export const getLocalBlocks = async (db: SQLite.SQLiteDatabase, blockerId: string) => {
    try {
        const results = await db.getAllAsync<any>(
            'SELECT blocked_id FROM blocked_users WHERE blocker_id = ?',
            [blockerId]
        );
        return results.map(row => row.blocked_id);
    } catch (error) {
        console.error('[ERROR] Failed to get local blocks:', error);
        return [];
    }
};

export const syncLocalBlocks = async (db: SQLite.SQLiteDatabase, blockerId: string, remoteBlockedIds: string[]) => {
    try {
        // Clear old blocks for this user and insert fresh ones
        await db.runAsync('DELETE FROM blocked_users WHERE blocker_id = ?', [blockerId]);
        for (const id of remoteBlockedIds) {
            await saveLocalBlock(db, blockerId, id);
        }
    } catch (error) {
        console.error('[ERROR] Failed to sync local blocks:', error);
    }
};
