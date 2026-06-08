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
                expires_at TEXT NOT NULL,
                encrypted_keys TEXT,
                mentioned_user_ids TEXT,
                audio_url TEXT,
                thumbnail_url TEXT
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
            await db.execAsync("ALTER TABLE messages ADD COLUMN message_type TEXT DEFAULT 'text';");
            console.log('[DB] Migration: Added message_type to messages');
        } catch (e) {
            // Column probably already exists, ignore
        }

        // Migration: Ensure new status fields exist
        try {
            await db.execAsync(`
                ALTER TABLE statuses ADD COLUMN encrypted_keys TEXT;
            `);
        } catch (e) { }
        try {
            await db.execAsync(`
                ALTER TABLE statuses ADD COLUMN mentioned_user_ids TEXT;
            `);
        } catch (e) { }
        try {
            await db.execAsync(`
                ALTER TABLE statuses ADD COLUMN audio_url TEXT;
            `);
        } catch (e) { }
        try {
            await db.execAsync(`
                ALTER TABLE statuses ADD COLUMN thumbnail_url TEXT;
            `);
        } catch (e) { }

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
