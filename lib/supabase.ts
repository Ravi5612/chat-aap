import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚡ Use AsyncStorage for session (10ms reads vs SecureStore's 1-3s on Android)
// This is safe — the session token is a JWT, not a raw password.
// WhatsApp, Telegram etc. all use AsyncStorage for session tokens.
const FastSessionStorage = {
    getItem: (key: string): Promise<string | null> => {
        if (isWeb) {
            return Promise.resolve(typeof window !== 'undefined' ? window.localStorage.getItem(key) : null);
        }
        return AsyncStorage.getItem(key);
    },
    setItem: (key: string, value: string): Promise<void> => {
        if (isWeb) {
            if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
            return Promise.resolve();
        }
        return AsyncStorage.setItem(key, value);
    },
    removeItem: (key: string): Promise<void> => {
        if (isWeb) {
            if (typeof window !== 'undefined') window.localStorage.removeItem(key);
            return Promise.resolve();
        }
        return AsyncStorage.removeItem(key);
    },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase URL or Anon Key in environment variables!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: FastSessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storageKey: 'sb-auth-token',
        flowType: 'pkce',
    },
});


// Helper functions for easy access
export const getCurrentSession = async () => {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    } catch (error) {
        return null;
    }
};

export const getCurrentUser = async () => {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        return null;
    }
};

export const resendVerification = async (email: string) => {
    try {
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email,
            options: {
                emailRedirectTo: process.env.EXPO_PUBLIC_APP_URL || `https://chat-warrios.vercel.app/login`,
            }
        });
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export default supabase;
