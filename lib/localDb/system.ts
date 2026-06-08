import * as SQLite from 'expo-sqlite';

export const clearAllLocalData = async (db: SQLite.SQLiteDatabase) => {
    try {
        const tables = [
            'messages', 'conversations', 'statuses', 'call_logs', 'profiles',
            'group_details', 'app_settings', 'wallpapers', 'drafts', 'search_history',
            'chat_settings', 'deleted_messages_me', 'blocked_users', 'media_cache', 'expenses'
        ];
        
        for (const table of tables) {
            try {
                await db.runAsync(`DELETE FROM ${table}`);
            } catch(e) {
                console.warn(`[DB] Failed to clear table ${table}:`, e);
            }
        }
        console.log('[DB] Successfully cleared all local data for logout');
    } catch (e) {
        console.error('[ERROR] Failed to clear local db on logout', e);
    }
};
