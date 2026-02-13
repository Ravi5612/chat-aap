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

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Initialize notifications & global listeners
  usePushNotifications(userId);
  useGlobalRealtime(userId);

  useEffect(() => {
    const initialize = async () => {
      console.log('RootLayout: Starting initialize...');
      try {
        // 1. Initial Check
        const { data: { session } } = await supabase.auth.getSession();
        console.log('RootLayout: Session found:', !!session);

        if (session) {
          setUserId(session.user.id);
          if (segments[0] !== '(tabs)') {
            router.replace('/(tabs)');
          }
        } else {
          // Only redirect if NOT on an auth page
          const currentSegments = segments as string[];
          const inAuthGroup = currentSegments[0] === '(auth)' || currentSegments.includes('login') || currentSegments.includes('signup');
          if (!inAuthGroup) {
            console.log('RootLayout: No session, redirecting to login');
            router.replace('/login');
          }
        }
      } catch (err) {
        console.error('RootLayout: Init error:', err);
      } finally {
        setIsReady(true);
        console.log('RootLayout: isReady set to true');
      }
    };

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('RootLayout: Auth event:', event);

      if (event === 'SIGNED_IN') {
        // Only redirect if we are on an auth page
        const inAuthGroup = segments[0] === '(auth)' || segments.includes('login') || segments.includes('signup');
        if (inAuthGroup) {
          router.replace('/(tabs)');
        }
      } else if (event === 'SIGNED_OUT') {
        router.replace('/login');
      }
    });

    initialize();

    return () => subscription.unsubscribe();
  }, [segments]); // Add segments back to dependency to check current route

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF5E6' }}>
        <ActivityIndicator size="large" color="#F68537" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: true }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
