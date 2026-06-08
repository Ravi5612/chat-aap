import * as SQLite from 'expo-sqlite';

export const saveLocalSearch = async (db: SQLite.SQLiteDatabase, query: string, type: string = 'global') => {
    try {
        if (!query.trim()) return;
        // Delete if already exists (to bring it to top)
        await db.runAsync('DELETE FROM search_history WHERE query = ? AND search_type = ?', [query, type]);
        // Insert new
        await db.runAsync(
            'INSERT INTO search_history (query, search_type, created_at) VALUES (?, ?, ?)',
            [query, type, new Date().toISOString()]
        );
        // Keep only top 10
        await db.runAsync(
            'DELETE FROM search_history WHERE id NOT IN (SELECT id FROM search_history ORDER BY created_at DESC LIMIT 10)'
        );
    } catch (error) {
        console.error('[ERROR] Failed to save search query:', error);
    }
};

export const getLocalSearches = async (db: SQLite.SQLiteDatabase, type: string = 'global') => {
    try {
        const results = await db.getAllAsync<any>(
            'SELECT * FROM search_history WHERE search_type = ? ORDER BY created_at DESC',
            [type]
        );
        return results;
    } catch (error) {
        console.error('[ERROR] Failed to get search queries:', error);
        return [];
    }
};

export const clearLocalSearch = async (db: SQLite.SQLiteDatabase, id: number) => {
    try {
        await db.runAsync('DELETE FROM search_history WHERE id = ?', [id]);
    } catch (error) {
        console.error('[ERROR] Failed to delete search query:', error);
    }
};
