import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useDbStore } from './useDbStore';
import { saveLocalProfile, getLocalProfile, updateLocalProfile, getPendingProfileSync, clearAllLocalData } from '@/lib/localDb';
import { AppStorage } from '@/lib/storage';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';

let killSwitchInterval: any = null;

interface AuthState {
    session: Session | null;
    user: any | null;
    profile: any | null;
    initializing: boolean;
    isRegistering: boolean;
    setSession: (session: Session | null) => void;
    setUser: (user: any | null) => void;
    setInitializing: (initializing: boolean) => void;
    setIsRegistering: (isRegistering: boolean) => void;
    signOut: () => Promise<void>;
    syncOnlineStatus: (isOnline: boolean) => Promise<void>;
    syncProfile: () => Promise<void>;
    updateProfile: (updates: any) => Promise<boolean>;
    syncPendingProfile: () => Promise<void>;
    syncDevice: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    user: null,
    profile: null,
    initializing: true,
    isRegistering: false,
    setSession: (session) => {
        set({ session, user: session?.user || null });
        if (session) {
            AppStorage.setItemAsync('supabase_session', JSON.stringify(session)).catch(() => {});
        } else {
            AppStorage.deleteItemAsync('supabase_session').catch(() => {});
        }
    },
    setUser: (user) => set({ user }),
    setInitializing: (initializing) => set({ initializing }),
    setIsRegistering: (isRegistering) => set({ isRegistering }),
    signOut: async () => {
        if (killSwitchInterval) {
            clearInterval(killSwitchInterval);
            killSwitchInterval = null;
        }

        const { user } = get();

        // 🛑 Clear All Local Stores and Databases by deleting the files!
        const { db } = useDbStore.getState();
        if (db) {
            try {
                // Try gracefully clearing data first
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

        const { useFriendsStore } = require('./useFriendsStore');
        const { useChatStore } = require('./useChatStore');
        const { clearCryptoCache } = require('@/utils/chatCrypto');
        
        useFriendsStore.getState().reset();
        useChatStore.getState().reset();
        clearCryptoCache();

        // Step 1: Turant state clear karo aur login pe bhejo — koi wait nahi!
        set({ session: null, user: null, profile: null });
        AppStorage.deleteItemAsync('supabase_session').catch(() => {});
        AppStorage.deleteItemAsync('ninja_vault_passcode').catch(() => {}); // clear vault passcode too
        router.replace('/login');

        // Step 2: Network calls background mein — logout ko block nahi karenge
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
    },
    syncProfile: async () => {
        const { user } = get();
        if (user?.id) {
            // 1. Try loading from Local DB first
            const { db } = useDbStore.getState();
            let hasLocalProfile = false;
            
            if (db) {
                const localProfile = await getLocalProfile(db, user.id);
                if (localProfile) {
                    console.log('AuthStore: Loaded self-profile from Local DB');
                    set({ profile: localProfile });
                    hasLocalProfile = true;
                }
            }

            const fetchNetwork = async () => {
                try {
                    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                    if (data) {
                        set({ profile: data });
                        if (db) saveLocalProfile(db, data);
                    }
                } catch (e) {
                    console.warn('Background profile sync error:', e);
                }
            };

            if (hasLocalProfile) {
                // Return immediately, fetch from network in background
                fetchNetwork();
            } else {
                // Need profile for routing, so await network if no local profile
                await fetchNetwork();
            }
        }
    },
    updateProfile: async (updates: any) => {
        const { user, profile } = get();
        if (!user?.id) return false;

        const { db } = useDbStore.getState();
        const updatedProfile = { ...profile, ...updates };

        // 1. Update UI and Local DB immediately (Optimistic)
        set({ profile: updatedProfile });
        if (db) {
            await updateLocalProfile(db, { ...updatedProfile, id: user.id }, true);
        }

        try {
            // 2. Try updating Supabase
            const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
            if (error) throw error;

            // 3. Success! Mark as synced in local DB
            if (db) {
                await updateLocalProfile(db, { id: user.id }, false);
            }
            return true;
        } catch (e) {
            console.warn('[OFFLINE] Profile update failed, saved locally for sync:', e);
            // It stays as needs_sync = 1 in SQLite
            return true; // Return true because it was saved locally
        }
    },
    syncPendingProfile: async () => {
        const { db } = useDbStore.getState();
        if (!db) return;

        const pending = await getPendingProfileSync(db);
        if (pending) {
            console.log('[SYNC] Pushing pending profile updates to Supabase...');
            const { needs_sync, ...updates } = pending;
            try {
                const { error } = await supabase.from('profiles').update(updates).eq('id', pending.id);
                if (!error) {
                    await updateLocalProfile(db, { id: pending.id }, false);
                    console.log('[SYNC] Profile sync successful');
                }
            } catch (e) {
                console.error('[SYNC] Profile sync failed:', e);
            }
        }
    },
    syncDevice: async () => {
        const { user } = get();
        if (!user?.id) return;

        try {
            // 1. Get or Generate Unique Device ID
            let deviceId = await AppStorage.getItemAsync('unique_device_id');
            if (!deviceId) {
                deviceId = Crypto.randomUUID();
                await AppStorage.setItemAsync('unique_device_id', deviceId);
            }

            // 2. Get Hardware Info
            const deviceName = Device.modelName || Device.deviceName || 'Unknown Device';
            const osVersion = `${Device.osName || 'OS'} ${Device.osVersion || ''}`.trim();

            // 3. Try to get IP-based Location (Silent fail if network error)
            let lastLocation = 'Unknown Location';
            try {
                // Check if we have a cached location to avoid rate limits
                const cachedLoc = await AppStorage.getItemAsync('device_location_cache');
                const cachedTime = await AppStorage.getItemAsync('device_location_time');
                const now = Date.now();
                if (cachedLoc && cachedTime && (now - parseInt(cachedTime)) < 24 * 60 * 60 * 1000) {
                    lastLocation = cachedLoc;
                } else {
                    const response = await fetch('https://ipapi.co/json/');
                    if (response.ok) {
                        const data = await response.json();
                        if (data.city && data.country_name) {
                            lastLocation = `${data.city}, ${data.country_name}`;
                            await AppStorage.setItemAsync('device_location_cache', lastLocation);
                            await AppStorage.setItemAsync('device_location_time', now.toString());
                        }
                    }
                }
            } catch (err) {
                console.warn('[syncDevice] Location fetch failed:', err);
                const cachedLoc = await AppStorage.getItemAsync('device_location_cache');
                if (cachedLoc) lastLocation = cachedLoc;
            }

            // 4. Upsert into database
            const { error } = await supabase.from('user_devices').upsert({
                user_id: user.id,
                device_id: deviceId,
                device_name: deviceName,
                os_version: osVersion,
                last_location: lastLocation,
                last_active: new Date().toISOString(),
                is_active: true
            }, { onConflict: 'user_id,device_id' });

            if (error) {
                console.warn('[syncDevice] Supabase Upsert error:', error);
            }

            // 5. Start Kill-Switch Polling (Check every 60 seconds)
            if (killSwitchInterval) clearInterval(killSwitchInterval);
            killSwitchInterval = setInterval(async () => {
                const currentUser = get().user;
                if (!currentUser?.id) return;
                
                try {
                    const { data, error } = await supabase
                        .from('user_devices')
                        .select('is_active')
                        .eq('user_id', currentUser.id)
                        .eq('device_id', deviceId)
                        .single();
                        
                    if (data && data.is_active === false) {
                        console.log('🚨 REMOTE LOGOUT INITIATED 🚨');
                        get().signOut();
                        alert('You have been logged out remotely from another device.');
                    }
                } catch (e) {
                    // Ignore transient network errors
                }
            }, 60000);

        } catch (error) {
            console.error('[syncDevice] Master Error:', error);
        }
    }
}));
