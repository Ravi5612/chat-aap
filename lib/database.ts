import * as SQLite from 'expo-sqlite';

const DB_NAME = 'chatwarriors_cache.db';
const CACHE_EXPIRY_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

// 1. Singleton DB instance to prevent opening a new connection on every cache call
let _dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDb = () => {
  if (!_dbInstance) {
    _dbInstance = SQLite.openDatabaseSync(DB_NAME);
  }
  return _dbInstance;
};

// Initialize tables
export const setupDatabase = () => {
  const db = getDb();
  
  // Note: This only initializes the generic app_cache table. 
  // Main app tables (messages, profiles) are handled separately via useDbStore -> initDatabase.
  db.execSync(`
    CREATE TABLE IF NOT EXISTS app_cache (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  if (__DEV__) console.log('[SQLite Cache] Database initialized successfully');
};

// Save any JSON data to cache
export const saveToCache = (key: string, data: any) => {
  try {
    const db = getDb();
    const timestamp = Date.now();
    const jsonValue = JSON.stringify(data);
    
    // Safety check for huge payloads
    if (jsonValue.length > 1024 * 1024) { // > 1MB
       if (__DEV__) console.warn(`[SQLite Cache] Warning: Trying to save very large data (>${Math.round(jsonValue.length/1024)}KB) to cache key: ${key}`);
    }

    db.runSync(
      `INSERT OR REPLACE INTO app_cache (key, value, updated_at) VALUES (?, ?, ?)`,
      [key, jsonValue, timestamp]
    );
  } catch (error) {
    if (__DEV__) console.error(`[SQLite Cache] Error saving ${key} to cache:`, error);
  }
};

// Retrieve JSON data from cache with Expiry Check
export const getFromCache = (key: string) => {
  try {
    const db = getDb();
    const row: any = db.getFirstSync(`SELECT value, updated_at FROM app_cache WHERE key = ?`, [key]);
    
    if (row && row.value) {
      // 3. Expiry check: Don't return outdated data forever
      const isExpired = (Date.now() - row.updated_at) > CACHE_EXPIRY_MS;
      if (isExpired) {
          db.runSync(`DELETE FROM app_cache WHERE key = ?`, [key]);
          if (__DEV__) console.log(`[SQLite Cache] Evicted expired cache for key: ${key}`);
          return null;
      }
      return JSON.parse(row.value);
    }
  } catch (error) {
    if (__DEV__) console.error(`[SQLite Cache] Error reading ${key} from cache:`, error);
  }
  return null;
};

// Clear all cache (useful for logout)
export const clearAllCache = () => {
  try {
    const db = getDb();
    db.runSync(`DELETE FROM app_cache`);
    if (__DEV__) console.log('[SQLite Cache] Successfully cleared all cache for logout');
  } catch (error) {
    if (__DEV__) console.error(`[SQLite Cache] Error clearing cache:`, error);
  }
};
