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
import { View, ActivityIndicator, AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { useAuthStore } from '@/store/useAuthStore';
import { useFriendsStore } from '@/store/useFriendsStore';
import { SplashScreen } from '@/components/SplashScreen';
import { BackgroundServices } from '@/components/BackgroundServices';
import * as Updates from 'expo-updates';

export default function RootLayout() {
  const { session, initializing, setSession, setInitializing, syncOnlineStatus } = useAuthStore();

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
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // 1. Setup Auth Listener & Initial Session
    const setupAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session) {
          useAuthStore.getState().syncProfile();
          useFriendsStore.getState().fetchBlockedUsers(session.user.id);
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
    if (initializing || !isMounted || showSplash) return;

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

  if (showSplash) {
    return <SplashScreen onAnimationFinish={() => setShowSplash(false)} />;
  }

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF5E6' }}>
        <ActivityIndicator size="large" color="#F68537" />
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
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <BackgroundServices />
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
