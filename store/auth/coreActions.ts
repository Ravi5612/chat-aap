import { AppStorage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useDbStore } from '../useDbStore';
import { clearAllLocalData } from '@/lib/localDb';
import { clearKillSwitch } from './deviceActions';
import { StoreGet } from './authTypes';

export const createCoreActions = (set: any, get: StoreGet) => ({
    signOut: async () => {
        clearKillSwitch();

        const { user } = get();

        const { db } = useDbStore.getState();
        if (db) {
            try {
                await clearAllLocalData(db);
                db.closeSync();
                console.log('[AuthStore] Closed DB connection for logout.');
            } catch(e) {
                console.warn('[AuthStore] Error closing DB:', e);
            }
        }

        try {
            const FileSystem = require('expo-file-system');
            const dbPath = `${FileSystem.documentDirectory}SQLite/chatwarriors.db`;
            const cacheDbPath = `${FileSystem.documentDirectory}SQLite/chatwarriors_cache.db`;
            await FileSystem.deleteAsync(dbPath, { idempotent: true });
            await FileSystem.deleteAsync(cacheDbPath, { idempotent: true });
            console.log('[AuthStore] Wiped physical database files!');
            useDbStore.setState({ db: null, isInitialized: false });
        } catch (e) {
            console.error('[AuthStore] Failed to wipe DB files:', e);
        }

        try {
            const { clearAllCache } = require('@/lib/database');
            clearAllCache();
        } catch(e) {
            console.warn('[AuthStore] Failed clearAllCache:', e);
        }

        const { useFriendsStore } = require('../useFriendsStore');
        const { useChatStore } = require('../useChatStore');
        const { clearCryptoCache } = require('@/utils/chatCrypto');
        
        useFriendsStore.getState().reset();
        useChatStore.getState().reset();
        clearCryptoCache();

        set({ session: null, user: null, profile: null });
        AppStorage.deleteItemAsync('supabase_session').catch(() => {});
        AppStorage.deleteItemAsync('ninja_vault_passcode').catch(() => {});
        router.replace('/login');

        try {
            if (user?.id) {
                await supabase.from('profiles').update({ is_online: false }).eq('id', user.id);
            }
        } catch (error) {
            console.error("Error updating online status:", error);
        }

        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Error signing out:", error);
        }
    },
    syncOnlineStatus: async (isOnline: boolean) => {
        const { user } = get();
        if (user?.id) {
            try {
                await supabase.from('profiles').update({ is_online: isOnline }).eq('id', user.id);
                console.log(`AuthStore: Synced is_online status to ${isOnline}`);
            } catch (e) {
                console.warn('AuthStore: Status sync failed:', e);
            }
        }
    }
});
