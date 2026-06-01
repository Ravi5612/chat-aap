import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useDbStore } from './useDbStore';
import { saveLocalProfile, getLocalProfile, updateLocalProfile, getPendingProfileSync } from '@/lib/localDb';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
    session: Session | null;
    user: any | null;
    profile: any | null;
    initializing: boolean;
    setSession: (session: Session | null) => void;
    setUser: (user: any | null) => void;
    setInitializing: (initializing: boolean) => void;
    signOut: () => Promise<void>;
    syncOnlineStatus: (isOnline: boolean) => Promise<void>;
    syncProfile: () => Promise<void>;
    updateProfile: (updates: any) => Promise<boolean>;
    syncPendingProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    user: null,
    profile: null,
    initializing: true,
    setSession: (session) => {
        set({ session, user: session?.user || null });
        if (session) {
            SecureStore.setItemAsync('supabase_session', JSON.stringify(session)).catch(() => {});
        } else {
            SecureStore.deleteItemAsync('supabase_session').catch(() => {});
        }
    },
    setUser: (user) => set({ user }),
    setInitializing: (initializing) => set({ initializing }),
    signOut: async () => {
        const { user } = get();

        // Step 1: Turant state clear karo aur login pe bhejo — koi wait nahi!
        set({ session: null, user: null, profile: null });
        SecureStore.deleteItemAsync('supabase_session').catch(() => {});
        router.replace('/login');

        // Step 2: Network calls background mein — logout ko block nahi karenge
        try {
            if (user?.id) {
                await supabase.from('profiles').update({ is_online: false }).eq('id', user.id);
            }
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
            if (db) {
                const localProfile = await getLocalProfile(db, user.id);
                if (localProfile) {
                    console.log('AuthStore: Loaded self-profile from Local DB');
                    set({ profile: localProfile });
                }
            }

            // 2. Fetch from Supabase
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (data) {
                set({ profile: data });
                // 3. Save to Local DB
                if (db) saveLocalProfile(db, data);
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
    }
}));
