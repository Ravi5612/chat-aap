import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import "../global.css";

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      const isAuthPage = segments.some(s => ['login', 'signup', 'forgot-password', 'reset-password'].includes(s));

      if (!session && !isAuthPage) {
        // Only redirect to login if we're not on an auth page and not signed in
        router.replace('/login');
      } else if (session && isAuthPage) {
        // Only redirect to tabs if we're on an auth page but ALREADY signed in
        router.replace('/(tabs)');
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const isAuthPage = segments.some(s => ['login', 'signup', 'forgot-password', 'reset-password'].includes(s));

      if (event === 'SIGNED_IN' && isAuthPage) {
        router.replace('/(tabs)');
      } else if (event === 'SIGNED_OUT') {
        router.replace('/login');
      }
    });

    checkAuth();

    return () => subscription.unsubscribe();
  }, [segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
