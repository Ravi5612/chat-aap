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

import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useGlobalRealtime } from '@/hooks/useGlobalRealtime';

import { Session, AuthChangeEvent } from '@supabase/supabase-js';

// ... imports

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Initialize notifications & global listeners
  usePushNotifications(session?.user?.id || null);
  useGlobalRealtime(session?.user?.id || null);

  useEffect(() => {
    // 1. Setup Auth Listener & Initial Session
    const setupAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
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
    if (initializing) return;

    const syncStatus = async () => {
      if (session?.user?.id) {
        try {
          await supabase.from('profiles').update({ is_online: true }).eq('id', session.user.id);
          console.log('RootLayout: Synced is_online status to true');
        } catch (e) {
          console.warn('RootLayout: Status sync failed:', e);
        }
      }
    };

    const inAuthGroup = segments[0] === '(auth)' || segments.includes('login') || segments.includes('signup');

    console.log('RootLayout Nav State:', {
      hasSession: !!session,
      inAuthGroup,
      segments: segments
    });

    if (session) {
      syncStatus();
      if (inAuthGroup) {
        console.log('Redirecting to (tabs)');
        router.replace('/(tabs)');
      } else if (segments.length === 0) {
        console.log('Redirecting to (tabs) from root');
        router.replace('/(tabs)');
      }
    } else if (!inAuthGroup) {
      console.log('Redirecting to login');
      router.replace('/login');
    }
  }, [session, initializing, segments]);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF5E6' }}>
        <ActivityIndicator size="large" color="#F68537" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: true }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
