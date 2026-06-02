import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import "../global.css";

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { View, ActivityIndicator, AppState, AppStateStatus, Image, Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { useAuthStore } from '@/store/useAuthStore';
import * as NativeSplashScreen from 'expo-splash-screen';

// Prevent native splash screen from auto-hiding
NativeSplashScreen.preventAutoHideAsync().catch(() => {});
import { useFriendsStore } from '@/store/useFriendsStore';
import { useDbStore } from '@/store/useDbStore';
import { SplashScreen } from '@/components/SplashScreen';
import { BackgroundServices } from '@/components/BackgroundServices';
import { CallOverlay } from '@/components/CallOverlay';
import * as Updates from 'expo-updates';
import { setupDatabase } from '@/lib/database';
import { useNearbyNotifications } from '@/hooks/useNearbyNotifications';
import * as SecureStore from 'expo-secure-store';
import { ErrorBoundaryProps } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import { initializeX25519Keys } from '@/utils/chatCrypto';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, backgroundColor: '#FFF5E6', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Text style={{ fontSize: 40 }}>⚠️</Text>
      </View>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 12, textAlign: 'center' }}>Oops! Something went wrong.</Text>
      <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 32, lineHeight: 20 }}>
        Don't worry, your data is safe. Let's try reloading the screen.
      </Text>
      <View style={{ backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12, width: '100%', marginBottom: 32 }}>
        <Text style={{ fontSize: 12, color: '#EF4444', fontFamily: 'monospace' }}>
          {error?.message || 'Unknown error occurred'}
        </Text>
      </View>
      <TouchableOpacity 
        onPress={retry}
        style={{ backgroundColor: '#F68537', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, width: '100%', alignItems: 'center' }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Reload App</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {
  const { session, initializing, setSession, setInitializing, syncOnlineStatus, profile } = useAuthStore();
  
  // Activate Nearby Tracking & Notifications
  useNearbyNotifications();

  useEffect(() => {
    async function onFetchUpdateAsync() {
      try {
        if (__DEV__) return;
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (error) {
        console.log(`Error fetching latest Expo update: ${error}`);
      }
    }
    onFetchUpdateAsync();
  }, []);



  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // 1. Setup Auth Listener & Initial Session
    const setupAuth = async () => {
      try {
        setupDatabase(); // Initialize SQLite local database
        
        // Initialize the useDbStore early and await it so it's ready before any screen mounts
        await useDbStore.getState().initialize();

        let didFetchCache = false;
        // Check for cached session to render Home instantly
        const cachedSessionStr = await SecureStore.getItemAsync('supabase_session').catch(() => null);
        const lastUserId = await SecureStore.getItemAsync('last_user_id').catch(() => null);

        if (cachedSessionStr) {
          try {
            const cachedSession = JSON.parse(cachedSessionStr);
            useAuthStore.setState({ session: cachedSession, user: cachedSession.user });
            // Pre-load profile & blocked users from cache
            await useAuthStore.getState().syncProfile();
            await useFriendsStore.getState().fetchBlockedUsers(cachedSession.user.id);
            didFetchCache = true;
          } catch (e) {
            console.warn('Error parsing cached session:', e);
          }
        }

        const { data: { session: liveSession } } = await supabase.auth.getSession();
        setSession(liveSession);
        
        if (liveSession) {
          const currentUserId = liveSession.user.id;
          
          // Security Check: If a different user logged in without proper logout, wipe the database
          if (lastUserId && lastUserId !== currentUserId) {
              const { db } = useDbStore.getState();
              if (db) {
                  const { clearAllLocalData } = require('@/lib/localDb');
                  await clearAllLocalData(db);
                  console.log('[SECURITY] Wiped local database due to user account switch');
              }
          }
          await SecureStore.setItemAsync('last_user_id', currentUserId);

          if (!didFetchCache || !cachedSessionStr || JSON.parse(cachedSessionStr).user.id !== currentUserId) {
             await useAuthStore.getState().syncProfile();
             await useFriendsStore.getState().fetchBlockedUsers(currentUserId);
          }
          try {
             const publicKeyBase64 = await initializeX25519Keys(liveSession.user.id);
             await supabase.from('profiles').update({ public_key: publicKeyBase64 }).eq('id', liveSession.user.id);
          } catch(e) { 
             console.warn('E2EE Init Error:', e); 
             useAuthStore.getState().signOut();
             Alert.alert("Security Check", "Please log in again with your password to restore your End-to-End Encryption keys.");
          }
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setInitializing(false);
      }
    };

    setupAuth();

    const lastAppStateTime = { current: 0 };

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const now = Date.now();
      if (now - lastAppStateTime.current < 2000) return;
      lastAppStateTime.current = now;
      
      const { session, syncOnlineStatus } = useAuthStore.getState();
      if (session?.user?.id) {
        if (nextAppState === 'active') {
          syncOnlineStatus(true);
        } else if (nextAppState === 'background' || nextAppState === 'inactive') {
          syncOnlineStatus(false);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setSession(session);
    });

    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  useEffect(() => {
    if (initializing || !isMounted || !rootNavigationState?.key) return;

    const inAuthGroup = (segments as string[]).includes('login') || (segments as string[]).includes('signup') || (segments as string[]).includes('forgot-password') || (segments as string[]).includes('reset-password');
    const isRoot = (segments as string[]).length === 0;

    const isSetupProfile = (segments as string[]).includes('setup-profile');

    if (session) {
      const profile = useAuthStore.getState().profile;

      // Profile abhi load nahi hua — wait karo, redirect mat karo
      if (!profile) return;

      const hasUsername = profile?.username;

      if (inAuthGroup || isRoot) {
        if (hasUsername) {
          router.replace('/(tabs)');
        } else {
          router.replace('/setup-profile');
        }
      }
    } else if (!inAuthGroup) {
      router.replace('/login');
    }
  }, [session, initializing, segments, isMounted, rootNavigationState?.key, profile]);




  useEffect(() => {
    if (!initializing) {
      setTimeout(() => {
        NativeSplashScreen.hideAsync().catch(() => {});
      }, 100);
    }
  }, [initializing]);

  if (initializing) {
    return <SplashScreen onAnimationFinish={() => {}} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={() => setTimeout(() => setIsMounted(true), 0)}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="group-info" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <BackgroundServices />
          <CallOverlay />
          <StatusBar style="auto" />
        </ThemeProvider>
    </GestureHandlerRootView>
  );
}
