import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

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
}

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    user: null,
    profile: null,
    initializing: true,
    setSession: (session) => set({ session, user: session?.user || null }),
    setUser: (user) => set({ user }),
    setInitializing: (initializing) => set({ initializing }),
    signOut: async () => {
        const { user } = get();
        if (user?.id) {
            await supabase.from('profiles').update({ is_online: false }).eq('id', user.id);
        }
        await supabase.auth.signOut();
        set({ session: null, user: null, profile: null });
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
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (data) set({ profile: data });
        }
    },
}));
