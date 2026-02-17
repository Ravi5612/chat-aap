import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import "../global.css";

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useGlobalRealtime } from '@/hooks/useGlobalRealtime';

import { Session, AuthChangeEvent } from '@supabase/supabase-js';

import { useAuthStore } from '@/store/useAuthStore';
import { useFriendsStore } from '@/store/useFriendsStore';
import { SplashScreen } from '@/components/SplashScreen';

export default function RootLayout() {
  const { session, initializing, setSession, setInitializing, syncOnlineStatus } = useAuthStore();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [isMounted, setIsMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Initialize notifications & global listeners
  usePushNotifications(session?.user?.id || null);
  useGlobalRealtime(session?.user?.id || null);

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (initializing || !isMounted || showSplash) return;

    if (session?.user?.id) {
      syncOnlineStatus(true);
    }

    const inAuthGroup = (segments as string[]).includes('login') || (segments as string[]).includes('signup');
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
          <Stack.Screen name="chat/[id]" options={{ headerShown: true }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
