import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import "../global.css";

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { View, ActivityIndicator, AppState, AppStateStatus, Image } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { useAuthStore } from '@/store/useAuthStore';
import { useFriendsStore } from '@/store/useFriendsStore';
import { SplashScreen } from '@/components/SplashScreen';
import { BackgroundServices } from '@/components/BackgroundServices';
import * as Updates from 'expo-updates';
import { setupDatabase } from '@/lib/database';
import { useNearbyNotifications } from '@/hooks/useNearbyNotifications';
import * as SecureStore from 'expo-secure-store';

export default function RootLayout() {
  const { session, initializing, setSession, setInitializing, syncOnlineStatus } = useAuthStore();
  
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
  const [isMounted, setIsMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // 1. Setup Auth Listener & Initial Session
    const setupAuth = async () => {
      try {
        setupDatabase(); // Initialize SQLite local database
        
        // Initialize the useDbStore early and await it so it's ready before any screen mounts
        const { useDbStore } = require('@/store/useDbStore');
        await useDbStore.getState().initialize();

        // Check for cached session to render Home instantly
        const cachedSessionStr = await SecureStore.getItemAsync('supabase_session').catch(() => null);
        if (cachedSessionStr) {
          try {
            const cachedSession = JSON.parse(cachedSessionStr);
            useAuthStore.setState({ session: cachedSession, user: cachedSession.user });
            // Pre-load profile & blocked users from cache
            useAuthStore.getState().syncProfile();
            useFriendsStore.getState().fetchBlockedUsers(cachedSession.user.id);
            setInitializing(false);
          } catch (e) {
            console.warn('Error parsing cached session:', e);
          }
        }

        const { data: { session: liveSession } } = await supabase.auth.getSession();
        setSession(liveSession);
        if (liveSession) {
          useAuthStore.getState().syncProfile();
          useFriendsStore.getState().fetchBlockedUsers(liveSession.user.id);
          // Skip the animated splash screen if the user is already logged in
          setShowSplash(false);
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

      console.log(`[DEBUG] RootLayout: AppState -> ${nextAppState}`);
      
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
    if (initializing || !isMounted) return;

    const inAuthGroup = (segments as string[]).includes('login') || (segments as string[]).includes('signup') || (segments as string[]).includes('forgot-password') || (segments as string[]).includes('reset-password');
    const isRoot = (segments as string[]).length === 0;

    if (session) {
      if (inAuthGroup || isRoot) {
        router.replace('/(tabs)');
      }
    } else if (!inAuthGroup) {
      router.replace('/login');
    }
  }, [session, initializing, segments, isMounted, showSplash]);



  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFF5E6', padding: 16, paddingTop: 60 }}>
        {/* Header Skeleton */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#E0D1BE', opacity: 0.6 }} />
            <View style={{ width: 100, height: 20, borderRadius: 4, backgroundColor: '#E0D1BE', opacity: 0.6 }} />
          </View>
          <View style={{ width: 80, height: 32, borderRadius: 16, backgroundColor: '#E0D1BE', opacity: 0.6 }} />
        </View>
        
        {/* List Skeleton */}
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#E0D1BE', opacity: 0.6 }} />
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ width: '65%', height: 18, borderRadius: 4, backgroundColor: '#E0D1BE', opacity: 0.6 }} />
              <View style={{ width: '45%', height: 14, borderRadius: 4, backgroundColor: '#E0D1BE', opacity: 0.6 }} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={() => setIsMounted(true)}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="group-info" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <BackgroundServices />
          <StatusBar style="auto" />
        </ThemeProvider>
    </GestureHandlerRootView>
  );
}
