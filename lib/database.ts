import * as SQLite from 'expo-sqlite';

const DB_NAME = 'chatwarriors.db';

// Helper to get database instance
export const getDb = () => {
  return SQLite.openDatabaseSync(DB_NAME);
};

// Initialize tables
export const setupDatabase = () => {
  const db = getDb();
  
  db.execSync(`
    CREATE TABLE IF NOT EXISTS app_cache (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  console.log('[SQLite] Database initialized successfully');
};

// Save any JSON data to cache
export const saveToCache = (key: string, data: any) => {
  try {
    const db = getDb();
    const timestamp = Date.now();
    const jsonValue = JSON.stringify(data);
    
    db.runSync(
      `INSERT OR REPLACE INTO app_cache (key, value, updated_at) VALUES (?, ?, ?)`,
      [key, jsonValue, timestamp]
    );
  } catch (error) {
    console.error(`[SQLite] Error saving ${key} to cache:`, error);
  }
};

// Retrieve JSON data from cache
export const getFromCache = (key: string) => {
  try {
    const db = getDb();
    const row: any = db.getFirstSync(`SELECT value FROM app_cache WHERE key = ?`, [key]);
    
    if (row && row.value) {
      return JSON.parse(row.value);
    }
  } catch (error) {
    console.error(`[SQLite] Error reading ${key} from cache:`, error);
  }
  return null;
};
