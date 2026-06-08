import * as SQLite from 'expo-sqlite';

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
