import { create } from 'zustand';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';

// Module-level variables for tracking subscriptions and debouncing
let watchSubscription: Location.LocationSubscription | null = null;
let lastDbUpdateTime = 0;
const DB_UPDATE_THROTTLE_MS = 60000; // Only hit DB max once per minute even if moving fast

interface LocationState {
    currentLocation: Location.LocationObject | null;
    isTracking: boolean;
    errorMsg: string | null;
    startTracking: (userId: string) => Promise<void>;
    stopTracking: () => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
    currentLocation: null,
    isTracking: false,
    errorMsg: null,

    startTracking: async (userId: string) => {
        if (get().isTracking) return;

        try {
            // 1. Check existing permission first to avoid unnecessary OS popups
            const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
            let foregroundStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const req = await Location.requestForegroundPermissionsAsync();
                foregroundStatus = req.status;
            }

            if (foregroundStatus !== 'granted') {
                set({ errorMsg: 'Permission to access location was denied' });
                return;
            }

            set({ isTracking: true });

            // Get initial location
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            set({ currentLocation: location });

            // Update Supabase instantly on start
            if (userId) {
                lastDbUpdateTime = Date.now();
                await supabase.from('profiles').update({
                    last_lat: location.coords.latitude,
                    last_long: location.coords.longitude,
                    // Note: Ideally updated_at is handled by a Postgres Trigger using now(), 
                    // but we provide a client fallback just in case.
                    last_location_update: new Date().toISOString()
                }).eq('id', userId);
            }

            // Clean up any existing stale subscription first
            if (watchSubscription) {
                watchSubscription.remove();
                watchSubscription = null;
            }

            // Real-time tracking (low power)
            watchSubscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 300000, // 5 minutes
                    distanceInterval: 100, // 100 meters
                },
                async (newLocation) => {
                    set({ currentLocation: newLocation });
                    
                    // 2. Debounce/Throttle network calls!
                    // Even if user is driving and hitting 100m every 5 seconds, 
                    // we ONLY hit the database once every 60 seconds to save bandwidth.
                    if (userId && (Date.now() - lastDbUpdateTime > DB_UPDATE_THROTTLE_MS)) {
                        lastDbUpdateTime = Date.now();
                        await supabase.from('profiles').update({
                            last_lat: newLocation.coords.latitude,
                            last_long: newLocation.coords.longitude,
                            last_location_update: new Date().toISOString()
                        }).eq('id', userId);
                    }
                }
            );

        } catch (error: any) {
            if (__DEV__) console.error("Location tracking error:", error);
            set({ errorMsg: error.message || 'Unknown location error', isTracking: false });
        }
    },

    stopTracking: () => {
        // Fix: Actually STOP the GPS hardware sensor
        if (watchSubscription) {
            watchSubscription.remove();
            watchSubscription = null;
        }
        set({ isTracking: false });
    }
}));
