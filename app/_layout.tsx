import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React, { useState, useEffect } from 'react';
import { Stack, useSegments, useRootNavigationState, ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import "../global.css";

import { useColorScheme } from '@/hooks/use-color-scheme';
import { View, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAuthStore } from '@/store/useAuthStore';
import * as NativeSplashScreen from 'expo-splash-screen';

// Prevent native splash screen from auto-hiding
NativeSplashScreen.preventAutoHideAsync().catch(() => {});

import { BackgroundServices } from '@/components/BackgroundServices';
import { CallOverlay } from '@/components/CallOverlay';
import { useNearbyNotifications } from '@/hooks/useNearbyNotifications';

// Modular Layout Hooks
import { useAppUpdates } from '@/hooks/layout/useAppUpdates';
import { useAppStateSync } from '@/hooks/layout/useAppStateSync';
import { useAuthInitialization } from '@/hooks/layout/useAuthInitialization';
import { useNavigationGuard } from '@/hooks/layout/useNavigationGuard';
import { useAppBadgeCount } from '@/hooks/layout/useAppBadgeCount';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    NativeSplashScreen.hideAsync().catch(() => {});
  }, []);

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
  const { initializing } = useAuthStore();
  
  // Activate Nearby Tracking & Notifications
  useNearbyNotifications();

  // App Updates
  useAppUpdates();

  const colorScheme = useColorScheme();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();
  const [isMounted, setIsMounted] = useState(false);

  // Auth Initialization (Sets up SQLite, restores cache, connects Supabase)
  useAuthInitialization();

  // App State Sync (Online/Offline status)
  useAppStateSync();

  // Navigation Guard (Redirects based on session)
  useNavigationGuard(segments as string[], isMounted, rootNavigationState?.key);

  // OS App Badge Synchronization
  useAppBadgeCount();

  useEffect(() => {
    if (!initializing) {
      setTimeout(() => {
        NativeSplashScreen.hideAsync().catch(() => {});
      }, 100);
    }
  }, [initializing]);

  // Safety net: if initializing is stuck for 10s, force it to false
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (useAuthStore.getState().initializing) {
        console.warn('[Layout] Init timeout safety triggered - forcing initializing=false');
        useAuthStore.getState().setInitializing(false);
      }
    }, 10000);
    return () => clearTimeout(safetyTimer);
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#F68537', fontSize: 18, fontWeight: 'bold' }}>Loading...</Text>
      </View>
    );
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
