import * as SQLite from 'expo-sqlite';

// Helper functions for Profile Sync
export const saveLocalProfile = async (db: SQLite.SQLiteDatabase, profile: any) => {
    try {
        await db.runAsync(
            'INSERT OR REPLACE INTO profiles (id, username, full_name, avatar_url, bio, last_seen, is_online, needs_sync, email, phone, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                profile.id, 
                profile.username || null, 
                profile.full_name || null,
                profile.avatar_url || null, 
                profile.bio || null, 
                profile.last_seen || null, 
                profile.is_online ? 1 : 0,
                profile.needs_sync ? 1 : 0,
                profile.email || null,
                profile.phone || null,
                profile.gender || null
            ]
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

export const updateLocalProfile = async (db: SQLite.SQLiteDatabase, profileData: any, needsSync: boolean = false) => {
    try {
        await db.runAsync(
            `UPDATE profiles SET 
                username = COALESCE(?, username), 
                full_name = COALESCE(?, full_name), 
                avatar_url = COALESCE(?, avatar_url), 
                bio = COALESCE(?, bio),
                email = COALESCE(?, email),
                phone = COALESCE(?, phone),
                gender = COALESCE(?, gender),
                needs_sync = ?
             WHERE id = ?`,
            [
                profileData.username || null, 
                profileData.full_name || null, 
                profileData.avatar_url || null, 
                profileData.bio || null,
                profileData.email || null,
                profileData.phone || null,
                profileData.gender || null,
                needsSync ? 1 : 0,
                profileData.id
            ]
        );
    } catch (error) {
        console.error('[ERROR] Failed to update local profile:', error);
    }
};

export const getPendingProfileSync = async (db: SQLite.SQLiteDatabase) => {
    try {
        return await db.getFirstAsync<any>('SELECT * FROM profiles WHERE needs_sync = 1');
    } catch (error) {
        console.error('[ERROR] Failed to get pending profile sync:', error);
        return null;
    }
};
