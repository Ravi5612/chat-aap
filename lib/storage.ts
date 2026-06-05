import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const STORAGE_DIR = `${FileSystem.documentDirectory}app_storage/`;

let initPromise: Promise<void> | null = null;

const ensureDir = (): Promise<void> => {
    if (Platform.OS === 'web') return Promise.resolve();
    if (!initPromise) {
        initPromise = (async () => {
            const info = await FileSystem.getInfoAsync(STORAGE_DIR);
            if (!info.exists) {
                await FileSystem.makeDirectoryAsync(STORAGE_DIR, { intermediates: true });
            }
        })();
    }
    return initPromise;
};

// Sequential queue to prevent concurrent FileSystem deadlock on Android
let currentTask: Promise<any> = Promise.resolve();
const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const result = currentTask.then(task, task);
    currentTask = result.catch(() => {});
    return result;
};

export const AppStorage = {
    getItemAsync: (key: string): Promise<string | null> => enqueue(async () => {
        if (Platform.OS === 'web') {
            return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
        }
        try {
            await ensureDir();
            const fileUri = `${STORAGE_DIR}${key}.txt`;
            const info = await FileSystem.getInfoAsync(fileUri);
            if (!info.exists) return null;
            return await FileSystem.readAsStringAsync(fileUri);
        } catch (e) {
            return null;
        }
    }),
    setItemAsync: (key: string, value: string): Promise<void> => enqueue(async () => {
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
            return;
        }
        try {
            await ensureDir();
            const fileUri = `${STORAGE_DIR}${key}.txt`;
            await FileSystem.writeAsStringAsync(fileUri, value);
        } catch (e) {
            console.warn('Storage Error:', e);
        }
    }),
    deleteItemAsync: (key: string): Promise<void> => enqueue(async () => {
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined') window.localStorage.removeItem(key);
            return;
        }
        try {
            const fileUri = `${STORAGE_DIR}${key}.txt`;
            const info = await FileSystem.getInfoAsync(fileUri);
            if (info.exists) {
                await FileSystem.deleteAsync(fileUri);
            }
        } catch (e) {
            console.warn('Storage Error:', e);
        }
    })
};
