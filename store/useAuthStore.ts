import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { AppStorage } from '@/lib/storage';
import { createCoreActions } from './auth/coreActions';
import { createProfileActions } from './auth/profileActions';
import { createDeviceActions } from './auth/deviceActions';

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

export const useAuthStore = create<AuthState>((set, get) => {
    const coreActions = createCoreActions(set, get);
    const profileActions = createProfileActions(set, get);
    const deviceActions = createDeviceActions(set, get);

    return {
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
        
        signOut: coreActions.signOut,
        syncOnlineStatus: coreActions.syncOnlineStatus,
        
        syncProfile: profileActions.syncProfile,
        updateProfile: profileActions.updateProfile,
        syncPendingProfile: profileActions.syncPendingProfile,
        
        syncDevice: deviceActions.syncDevice,
    };
});
