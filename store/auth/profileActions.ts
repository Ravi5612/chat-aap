import { useDbStore } from '../useDbStore';
import { saveLocalProfile, getLocalProfile, updateLocalProfile, getPendingProfileSync } from '@/lib/localDb';
import { supabase } from '@/lib/supabase';
import { StoreGet } from './authTypes';

export const createProfileActions = (set: any, get: StoreGet) => ({
    syncProfile: async () => {
        const { user } = get();
        if (user?.id) {
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
                fetchNetwork();
            } else {
                await fetchNetwork();
            }
        }
    },
    updateProfile: async (updates: any) => {
        const { user, profile } = get();
        if (!user?.id) return false;

        const { db } = useDbStore.getState();
        const updatedProfile = { ...profile, ...updates };

        set({ profile: updatedProfile });
        if (db) {
            await updateLocalProfile(db, { ...updatedProfile, id: user.id }, true);
        }

        try {
            const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
            if (error) throw error;

            if (db) {
                await updateLocalProfile(db, { id: user.id }, false);
            }
            return true;
        } catch (e) {
            console.warn('[OFFLINE] Profile update failed, saved locally for sync:', e);
            return true;
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
});
