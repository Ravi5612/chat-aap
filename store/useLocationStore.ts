import { create } from 'zustand';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';

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
            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
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

            // Update Supabase
            if (userId) {
                await supabase.from('profiles').update({
                    last_lat: location.coords.latitude,
                    last_long: location.coords.longitude,
                    last_location_update: new Date().toISOString()
                }).eq('id', userId);
            }

            // Real-time tracking (low power)
            await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 300000, // 5 minutes
                    distanceInterval: 100, // 100 meters
                },
                async (newLocation) => {
                    set({ currentLocation: newLocation });
                    if (userId) {
                        await supabase.from('profiles').update({
                            last_lat: newLocation.coords.latitude,
                            last_long: newLocation.coords.longitude,
                            last_location_update: new Date().toISOString()
                        }).eq('id', userId);
                    }
                }
            );

        } catch (error: any) {
            set({ errorMsg: error.message, isTracking: false });
        }
    },

    stopTracking: () => {
        set({ isTracking: false });
    }
}));
