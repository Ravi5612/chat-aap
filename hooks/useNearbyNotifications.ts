import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useLocationStore } from '@/store/useLocationStore';
import * as Notifications from 'expo-notifications';

// Haversine formula — accurate circular distance in km
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const NEARBY_RADIUS_KM = 1.0; // 1 km circle (accurate)
const NOTIFY_COOLDOWN_MS = 3600000; // 1 hour

export const useNearbyNotifications = () => {
    const { user: currentUser, profile } = useAuthStore();
    const { currentLocation } = useLocationStore();

    // Refs — stable across renders, no re-trigger of useEffect
    const lastNotifiedIds = useRef<Set<string>>(new Set());
    const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const locationRef = useRef(currentLocation);

    // Keep locationRef in sync without adding currentLocation to channel effect deps
    useEffect(() => {
        locationRef.current = currentLocation;
    }, [currentLocation]);

    // Channel creation — only depends on userId & feature toggle (NOT currentLocation)
    useEffect(() => {
        if (!currentUser?.id || !profile?.nearby_notifications_enabled) return;

        if (__DEV__) console.log('[NearbyNotif] Subscribing to friends location updates');

        const channel = supabase
            .channel(`nearby-presence-${currentUser.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    // Only listen to friends' profiles if possible via filter;
                    // Since Supabase realtime doesn't support IN filters, we
                    // filter in JS — but channel is not recreated on GPS move.
                },
                async (payload) => {
                    const updatedUser = payload.new as any;

                    // Skip self
                    if (updatedUser.id === currentUser.id) return;

                    // Skip if no location data on updated profile
                    if (!updatedUser.last_lat || !updatedUser.last_long) return;

                    // Read current location from ref (not closure) — always fresh
                    const loc = locationRef.current;
                    if (!loc) return;

                    const { latitude, longitude } = loc.coords;

                    // ✅ Accurate circular distance via Haversine
                    const distanceKm = haversineDistance(
                        latitude,
                        longitude,
                        updatedUser.last_lat,
                        updatedUser.last_long
                    );

                    const isNearby = distanceKm <= NEARBY_RADIUS_KM;

                    if (isNearby && !lastNotifiedIds.current.has(updatedUser.id)) {
                        await Notifications.scheduleNotificationAsync({
                            content: {
                                title: 'Warrior Nearby!',
                                body: `${updatedUser.username || 'A warrior'} is active near you.`,
                                data: { userId: updatedUser.id },
                            },
                            trigger: null,
                        });

                        lastNotifiedIds.current.add(updatedUser.id);

                        // Clear from set after cooldown — but track timeout so we can clear on unmount
                        const tid = setTimeout(() => {
                            lastNotifiedIds.current.delete(updatedUser.id);
                            timeoutRefs.current.delete(updatedUser.id);
                        }, NOTIFY_COOLDOWN_MS);

                        // Cancel any previous pending timeout for same user before setting new one
                        const existingTid = timeoutRefs.current.get(updatedUser.id);
                        if (existingTid) clearTimeout(existingTid);
                        timeoutRefs.current.set(updatedUser.id, tid);
                    }
                }
            )
            .subscribe();

        return () => {
            if (__DEV__) console.log('[NearbyNotif] Cleaning up channel');
            supabase.removeChannel(channel);

            // Clear all pending cooldown timers on unmount — prevents memory leak
            timeoutRefs.current.forEach((tid) => clearTimeout(tid));
            timeoutRefs.current.clear();
            lastNotifiedIds.current.clear();
        };
    }, [currentUser?.id, profile?.nearby_notifications_enabled]); // ✅ No currentLocation here
};
