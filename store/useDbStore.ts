import { create } from 'zustand';
import { initDatabase } from '@/lib/localDb';
import * as SQLite from 'expo-sqlite';

interface DbState {
    db: SQLite.SQLiteDatabase | null;
    isInitialized: boolean;
    initialize: () => Promise<void>;
}

export const useDbStore = create<DbState>((set, get) => ({
    db: null,
    isInitialized: false,
    initialize: async () => {
        if (get().isInitialized) return;
        try {
            const db = await initDatabase();
            set({ db, isInitialized: true });
        } catch (error) {
            console.error('DbStore: Initialization failed', error);
        }
    }
}));
