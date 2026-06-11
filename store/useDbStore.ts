import { create } from 'zustand';
import { initDatabase } from '@/lib/localDb';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

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
            if (Platform.OS === 'web') {
                set({ db: null, isInitialized: true, error: null });
                return;
            }
            try {
                // 8-second timeout to prevent infinite hang if SQLite deadlocks
                let timer: ReturnType<typeof setTimeout>;
                let isSettled = false;
                
                const timeoutPromise = new Promise<never>((_, reject) => {
                    timer = setTimeout(() => {
                        if (!isSettled) {
                            isSettled = true;
                            reject(new Error('Database initialization timeout after 8s'));
                        }
                    }, 8000);
                });
                
                const db = await Promise.race([
                    initDatabase().then(res => {
                        isSettled = true;
                        clearTimeout(timer);
                        return res;
                    }).catch(err => {
                        const wasSettled = isSettled;
                        isSettled = true;
                        clearTimeout(timer);
                        if (wasSettled) return null as any;
                        throw err;
                    }),
                    timeoutPromise
                ]);
                
                set({ db: db as SQLite.SQLiteDatabase, isInitialized: true, error: null });
            } catch (error: any) {
                console.error('DbStore: Initialization failed or timed out', error);
                const { useFriendsStore } = require('@/store/useFriendsStore');
                useFriendsStore.getState().addDebugLog(`[DbStore] Init Error: ${error.message}`);
                
                // Attempt to delete the corrupted database file so it recovers next time
                try {
                    const FileSystem = require('expo-file-system');
                    const dbPath = `${FileSystem.documentDirectory}SQLite/chatwarriors.db`;
                    await FileSystem.deleteAsync(dbPath, { idempotent: true });
                    console.log('Deleted corrupted database file to recover');
                } catch(e) {}

                // Even on error, mark as initialized so the app doesn't hang
                set({ db: null, isInitialized: true, error: error.message || 'Initialization failed' });
            } finally {
                // Always reset initPromise so a future retry can work
                initPromise = null;
            }
        })();

        return initPromise;
    }
}));
