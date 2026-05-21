import { create } from 'zustand';
import { initDatabase } from '@/lib/localDb';
import * as SQLite from 'expo-sqlite';

interface DbState {
    db: SQLite.SQLiteDatabase | null;
    isInitialized: boolean;
    error: string | null;
    initialize: () => Promise<void>;
}

let initPromise: Promise<void> | null = null;

export const useDbStore = create<DbState>((set, get) => ({
    db: null,
    isInitialized: false,
    error: null,
    initialize: async () => {
        if (get().isInitialized) return;
        
        if (initPromise) return initPromise;

        initPromise = (async () => {
            try {
                const db = await initDatabase();
                set({ db, isInitialized: true, error: null });
            } catch (error: any) {
                if (__DEV__) {
                    console.error('DbStore: Initialization failed', error);
                }
                set({ error: error.message || 'Initialization failed' });
            }
        })();

        return initPromise;
    }
}));
