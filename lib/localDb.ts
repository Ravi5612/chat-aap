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
                avatar TEXT,
                is_locked INTEGER DEFAULT 0,
                is_favorite INTEGER DEFAULT 0,
                is_archived INTEGER DEFAULT 0,
                is_hidden INTEGER DEFAULT 0
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
                full_name TEXT,
                avatar_url TEXT,
                bio TEXT,
                last_seen TEXT,
                is_online INTEGER,
                needs_sync INTEGER DEFAULT 0
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

        // 9. Create Drafts Table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS drafts (
                chat_id TEXT PRIMARY KEY NOT NULL,
                content TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        `);

        // 10. Create Search History Table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS search_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query TEXT NOT NULL,
                search_type TEXT NOT NULL, -- 'friend', 'message', 'global'
                created_at TEXT NOT NULL
            );
        `);

        // 11. Create Chat Settings Table (for "Clear for me")
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS chat_settings (
                chat_id TEXT PRIMARY KEY NOT NULL,
                last_cleared_at TEXT
            );
        `);

        // 12. Individual Deleted Messages Table (Delete for Me)
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS deleted_messages_me (
                message_id TEXT PRIMARY KEY NOT NULL
            );
        `);

        // 13. Blocked Users Table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS blocked_users (
                blocker_id TEXT NOT NULL,
                blocked_id TEXT NOT NULL,
                PRIMARY KEY (blocker_id, blocked_id)
            );
        `);

        // 14. Media Cache Table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS media_cache (
                remote_url TEXT PRIMARY KEY NOT NULL,
                local_uri TEXT NOT NULL,
                file_type TEXT,
                file_size INTEGER,
                created_at TEXT NOT NULL
            );
        `);

        // 15. Create Indexes for Messages Table
        await db.execAsync(`
            CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_id);
            CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages (receiver_id);
            CREATE INDEX IF NOT EXISTS idx_messages_group ON messages (group_id);
            CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at DESC);
        `);


        // Migration: Ensure needs_sync exists in profiles
        try {
            await db.execAsync('ALTER TABLE profiles ADD COLUMN needs_sync INTEGER DEFAULT 0;');
            console.log('[DB] Migration: Added needs_sync to profiles');
        } catch (e) {
            // Column probably already exists, ignore
        }

        // Migration: Ensure full_name exists in profiles (for older versions)
        try {
            await db.execAsync('ALTER TABLE profiles ADD COLUMN full_name TEXT;');
            console.log('[DB] Migration: Added full_name to profiles');
        } catch (e) {
            // Column probably already exists, ignore
        }

        // Migration: Ensure is_locked exists in conversations
        try {
            await db.execAsync('ALTER TABLE conversations ADD COLUMN is_locked INTEGER DEFAULT 0;');
            console.log('[DB] Migration: Added is_locked to conversations');
        } catch (e) {
            // Column probably already exists, ignore
        }

        // Migration: Ensure is_favorite and is_archived exist
        try {
            await db.execAsync('ALTER TABLE conversations ADD COLUMN is_favorite INTEGER DEFAULT 0;');
            await db.execAsync('ALTER TABLE conversations ADD COLUMN is_archived INTEGER DEFAULT 0;');
            console.log('[DB] Migration: Added is_favorite and is_archived to conversations');
        } catch (e) {
            // Columns probably already exist, ignore
        }

        // Migration: Ensure is_hidden exists
        try {
            await db.execAsync('ALTER TABLE conversations ADD COLUMN is_hidden INTEGER DEFAULT 0;');
            console.log('[DB] Migration: Added is_hidden to conversations');
        } catch (e) {
            // Column probably already exists, ignore
        }

        // Migration: Ensure email exists in conversations
        try {
            await db.execAsync('ALTER TABLE conversations ADD COLUMN email TEXT;');
            console.log('[DB] Migration: Added email to conversations');
        } catch (e) {
            // Column probably already exists, ignore
        }

        // Migration: Ensure is_unfriended exists in conversations
        try {
            await db.execAsync('ALTER TABLE conversations ADD COLUMN is_unfriended INTEGER DEFAULT 0;');
            console.log('[DB] Migration: Added is_unfriended to conversations');
        } catch (e) {
            // Column probably already exists, ignore
        }

        // Migration: Ensure message_type exists in messages
        try {
            await db.execAsync('ALTER TABLE messages ADD COLUMN message_type TEXT DEFAULT \'text\';');
            console.log('[DB] Migration: Added message_type to messages');
        } catch (e) {
            // Column probably already exists, ignore
        }

        // 14. Expenses Table (Hard Reset to fix schema issues)
        try {
            // Re-creating the table with the correct schema
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS expenses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    friend_id TEXT NOT NULL,
                    amount REAL NOT NULL,
                    description TEXT,
                    type TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    sync_id TEXT UNIQUE
                );
            `);
            console.log('[DB] Expenses table initialized');
        } catch (e) {
            console.error('[DB] Expenses table init failed:', e);
        }

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
            (id, sender_id, receiver_id, group_id, message, file_url, file_type, file_name, status, is_read, reply_to_id, created_at, reactions, message_type) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                JSON.stringify(msg.reactions || {}),
                msg.message_type || 'text'
            ]
        );

        // ✅ Automatically process Ledger Sync if message is type 'ledger'
        if (msg.message_type === 'ledger' && msg.message?.startsWith('SYSTEM_LEDGER:')) {
            try {
                const rawData = msg.message.replace('SYSTEM_LEDGER:', '');
                const ledgerData = JSON.parse(rawData);
                
                // Use useAuthStore to get current user ID
                const { useAuthStore } = require('@/store/useAuthStore');
                const currentUserId = useAuthStore.getState().user?.id;
                
                const isMe = msg.sender_id === currentUserId;
                const friendId = isMe ? msg.receiver_id : msg.sender_id;
                
                // Flip type ONLY if we are the receiver
                const finalType = isMe ? ledgerData.type : (ledgerData.type === 'gave' ? 'took' : 'gave');
                
                if (friendId) {
                    await addLocalExpense(
                        db, 
                        friendId, 
                        ledgerData.amount, 
                        ledgerData.description, 
                        finalType,
                        msg.id // Use message ID as sync_id
                    );
                    console.log(`[DB] Ledger sync successful. Type: ${finalType}, isMe: ${isMe}`);
                }
            } catch (e) {
                console.warn('[DB] Ledger auto-sync failed:', e);
            }
        }
    } catch (error) {
        console.error('[ERROR] Failed to save local message:', error);
    }
};

// ✅ Dedicated Ledger Sync Function
export const syncLedgerExpense = async (db: SQLite.SQLiteDatabase, msg: any, currentUserId: string) => {
    if (msg.message_type !== 'ledger' || !msg.message?.startsWith('SYSTEM_LEDGER:')) return;

    try {
        const rawData = msg.message.replace('SYSTEM_LEDGER:', '');
        const ledgerData = JSON.parse(rawData);
        
        // Ensure IDs are strings and lowercased for safe comparison
        const senderId = msg.sender_id?.toString().toLowerCase();
        const myId = currentUserId?.toString().toLowerCase();
        
        const isMe = senderId === myId;
        const friendId = isMe ? msg.receiver_id : msg.sender_id;
        
        // Flip type ONLY if we are the receiver
        let finalType = ledgerData.type;
        if (!isMe) {
            finalType = ledgerData.type === 'gave' ? 'took' : 'gave';
        }
        
        const syncId = ledgerData.syncId || msg.id;

        if (friendId) {
            await addLocalExpense(
                db, 
                friendId, 
                ledgerData.amount, 
                ledgerData.description, 
                finalType,
                syncId
            );
            console.log(`[LEDGER] Sync processed. FinalType: ${finalType}, isMe: ${isMe}, friendId: ${friendId}`);
        }
    } catch (e) {
        console.error('[LEDGER] Sync failed:', e);
    }
};

export const getLocalMessages = async (db: SQLite.SQLiteDatabase, friendId: string, isGroup: boolean = false, limit: number = 20, offset: number = 0) => {
    try {
        const { useAuthStore } = require('@/store/useAuthStore');
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) return [];

        const query = isGroup 
            ? `SELECT m.*, 
                      r.id as reply_id, r.message as reply_message, r.sender_id as reply_sender_id, r.file_url as reply_file_url, r.file_type as reply_file_type
               FROM messages m 
               LEFT JOIN messages r ON m.reply_to_id = r.id 
               WHERE m.group_id = ? 
               ORDER BY m.created_at DESC LIMIT ? OFFSET ?`
            : `SELECT m.*, 
                      r.id as reply_id, r.message as reply_message, r.sender_id as reply_sender_id, r.file_url as reply_file_url, r.file_type as reply_file_type
               FROM messages m 
               LEFT JOIN messages r ON m.reply_to_id = r.id 
               WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)) AND m.group_id IS NULL 
               ORDER BY m.created_at DESC LIMIT ? OFFSET ?`;
        
        const params = isGroup ? [friendId, limit, offset] : [currentUser.id, friendId, friendId, currentUser.id, limit, offset];
        const results = await db.getAllAsync<any>(query, params);
        
        return results.map(row => {
            let reply = null;
            if (row.reply_id) {
                reply = {
                    id: row.reply_id,
                    message: row.reply_message,
                    sender_id: row.reply_sender_id,
                    file_url: row.reply_file_url,
                    file_type: row.reply_file_type
                };
            }
            
            // Clean up the row object
            const { reply_id, reply_message, reply_sender_id, reply_file_url, reply_file_type, ...cleanRow } = row;
            
            return {
                ...cleanRow,
                is_read: cleanRow.is_read === 1,
                reactions: JSON.parse(cleanRow.reactions || '{}'),
                reply: reply
            };
        });
    } catch (error) {
        console.error('[ERROR] Failed to get local messages:', error);
        return [];
    }
};

// Helper functions for Profile Sync
export const saveLocalProfile = async (db: SQLite.SQLiteDatabase, profile: any) => {
    try {
        await db.runAsync(
            'INSERT OR REPLACE INTO profiles (id, username, full_name, avatar_url, bio, last_seen, is_online, needs_sync) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                profile.id, 
                profile.username || null, 
                profile.full_name || null,
                profile.avatar_url || null, 
                profile.bio || null, 
                profile.last_seen || null, 
                profile.is_online ? 1 : 0,
                profile.needs_sync ? 1 : 0
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

// Helper functions for Drafts
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

// Helper functions for Search History
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

// Helper functions for Media Cache
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

// Helper functions for Profile Sync
export const updateLocalProfile = async (db: SQLite.SQLiteDatabase, profileData: any, needsSync: boolean = false) => {
    try {
        await db.runAsync(
            `UPDATE profiles SET 
                username = COALESCE(?, username), 
                full_name = COALESCE(?, full_name), 
                avatar_url = COALESCE(?, avatar_url), 
                bio = COALESCE(?, bio),
                needs_sync = ?
             WHERE id = ?`,
            [
                profileData.username || null, 
                profileData.full_name || null, 
                profileData.avatar_url || null, 
                profileData.bio || null,
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

// Helper functions for Expenses (Hisab-Kitab)
export const addLocalExpense = async (db: SQLite.SQLiteDatabase, friendId: string, amount: number, description: string, type: 'gave' | 'took', syncId?: string) => {
    try {
        // Try with sync_id first (deduplication)
        await db.runAsync(
            `INSERT OR IGNORE INTO expenses (friend_id, amount, description, type, created_at, sync_id) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [friendId, amount, description, type, new Date().toISOString(), syncId || null]
        );
        console.log(`[LEDGER] Added with syncId: ${syncId}`);
    } catch (error) {
        console.warn('[LEDGER] Insert with sync_id failed, trying fallback...', error);
        try {
            // Fallback: Save without sync_id constraint if something is wrong
            await db.runAsync(
                `INSERT INTO expenses (friend_id, amount, description, type, created_at) VALUES (?, ?, ?, ?, ?)`,
                [friendId, amount, description, type, new Date().toISOString()]
            );
            console.log('[LEDGER] Added with fallback (no syncId)');
        } catch (innerError) {
            console.error('[LEDGER] Critical failure adding expense:', innerError);
        }
    }

    // ✅ NEW: Push to Supabase Cloud
    try {
        const { supabase } = require('./supabase');
        const { useAuthStore } = require('@/store/useAuthStore');
        const user = useAuthStore.getState().user;
        
        if (user) {
            await supabase.from('ledger').upsert({
                user_id: user.id,
                friend_id: friendId,
                amount: amount,
                description: description,
                type: type,
                sync_id: syncId || `legacy-${Date.now()}`
            });
            console.log('[LEDGER] Pushed to Supabase');
        }
    } catch (e) {
        console.warn('[LEDGER] Supabase sync skipped/failed:', e);
    }
};

export const getLocalExpenses = async (db: SQLite.SQLiteDatabase, friendId: string) => {
    try {
        return await db.getAllAsync<any>('SELECT * FROM expenses WHERE friend_id = ? ORDER BY created_at DESC', [friendId]);
    } catch (error) {
        console.error('[ERROR] Failed to get expenses:', error);
        return [];
    }
};

export const getExpenseBalance = async (db: SQLite.SQLiteDatabase, friendId: string) => {
    try {
        const rows = await db.getAllAsync<any>('SELECT amount, type FROM expenses WHERE friend_id = ?', [friendId]);
        let total = 0;
        rows.forEach(row => {
            if (row.type === 'gave') total += row.amount; // Lene hain
            else total -= row.amount; // Dene hain
        });
        return total;
    } catch (error) {
        console.error('[ERROR] Failed to calculate balance:', error);
        return 0;
    }
};

export const deleteLocalExpense = async (db: SQLite.SQLiteDatabase, id: number) => {
    try {
        await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
    } catch (error) {
        console.error('[ERROR] Failed to delete expense:', error);
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
            `INSERT OR REPLACE INTO conversations (id, name, email, avatar, last_message, last_message_at, unread_count, is_group, is_locked, is_favorite, is_archived, is_unfriended, is_hidden) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                conv.id,
                conv.name || 'Unknown',
                conv.email || null,
                conv.img || null,
                conv.last_message || '',
                conv.lastActivity || '0',
                conv.unreadCount || 0,
                conv.isGroup ? 1 : 0,
                conv.isLocked ? 1 : 0,
                conv.isFavorite ? 1 : 0,
                conv.isArchived ? 1 : 0,
                conv.isUnfriended ? 1 : 0,
                conv.isHidden ? 1 : 0
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
            email: row.email,
            img: row.avatar,
            unreadCount: row.unread_count,
            isGroup: row.is_group === 1,
            isLocked: row.is_locked === 1,
            isFavorite: row.is_favorite === 1,
            isArchived: row.is_archived === 1,
            isUnfriended: row.is_unfriended === 1,
            isHidden: row.is_hidden === 1,
            lastActivity: row.last_message_at
        }));


    } catch (error) {
        console.error('[ERROR] Failed to get local conversations:', error);
        return [];
    }
};

export const clearLocalChat = async (db: SQLite.SQLiteDatabase, friendId: string, isGroup: boolean = false) => {
    const query = isGroup 
        ? 'DELETE FROM messages WHERE group_id = ?'
        : 'DELETE FROM messages WHERE (sender_id = ? OR receiver_id = ?) AND group_id IS NULL';
    
    const params = isGroup ? [friendId] : [friendId, friendId];
    await db.runAsync(query, params);
};

export const saveChatClearTimestamp = async (db: SQLite.SQLiteDatabase, chatId: string, timestamp: string) => {
    await db.runAsync(
        'INSERT OR REPLACE INTO chat_settings (chat_id, last_cleared_at) VALUES (?, ?)',
        [chatId, timestamp]
    );
};

export const getChatClearTimestamp = async (db: SQLite.SQLiteDatabase, chatId: string) => {
    try {
        const result = await db.getFirstAsync<any>(
            'SELECT last_cleared_at FROM chat_settings WHERE chat_id = ?',
            [chatId]
        );
        return result ? result.last_cleared_at : null;
    } catch (error) {
        console.error('[ERROR] Failed to get chat clear timestamp:', error);
        return null;
    }
};

export const markMessageAsDeletedLocally = async (db: SQLite.SQLiteDatabase, messageId: string) => {
    await db.runAsync('INSERT OR REPLACE INTO deleted_messages_me (message_id) VALUES (?)', [messageId]);
};

// Mark a message as 'delivered' in local DB
export const markMessageDeliveredLocally = async (db: SQLite.SQLiteDatabase, messageId: string) => {
    try {
        await db.runAsync(
            `UPDATE messages SET status = 'delivered' WHERE id = ? AND status = 'sent'`,
            [messageId]
        );
    } catch (error) {
        if (__DEV__) console.error('[ERROR] Failed to mark message delivered locally:', error);
    }
};

// Batch mark messages as 'delivered' in local DB
export const batchMarkMessageDeliveredLocally = async (db: SQLite.SQLiteDatabase, messageIds: string[]) => {
    try {
        if (!messageIds || messageIds.length === 0) return;
        const placeholders = messageIds.map(() => '?').join(',');
        await db.runAsync(
            `UPDATE messages SET status = 'delivered' WHERE id IN (${placeholders}) AND status = 'sent'`,
            messageIds
        );
    } catch (error) {
        if (__DEV__) console.error('[ERROR] Failed to batch mark messages delivered locally:', error);
    }
};

// Get all messages that need delivered sync (sent to me, status still 'sent')
export const getPendingDeliveredMessages = async (db: SQLite.SQLiteDatabase, myUserId: string) => {
    try {
        return await db.getAllAsync<any>(
            `SELECT id, sender_id FROM messages WHERE receiver_id = ? AND status = 'sent' AND group_id IS NULL`,
            [myUserId]
        );
    } catch (error) {
        console.error('[ERROR] Failed to get pending delivered messages:', error);
        return [];
    }
};

export const getLocallyDeletedMessages = async (db: SQLite.SQLiteDatabase) => {
    try {
        const results = await db.getAllAsync<any>('SELECT message_id FROM deleted_messages_me');
        return results.map(r => r.message_id);
    } catch (error) {
        console.error('[ERROR] Failed to get locally deleted messages:', error);
        return [];
    }
};

// Helper functions for Blocked Users
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

