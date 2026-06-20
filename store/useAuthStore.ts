import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

import { AppAnalytics } from '@/lib/analytics';

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
                // ⚡ AsyncStorage is 100x faster than FileSystem for session caching
                AsyncStorage.setItem('supabase_session', JSON.stringify(session)).catch(() => {});
                AppAnalytics.setUserId(session.user.id);
            } else {
                AsyncStorage.removeItem('supabase_session').catch(() => {});
                AppAnalytics.setUserId(null);
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
