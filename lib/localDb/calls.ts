import * as SQLite from 'expo-sqlite';

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
