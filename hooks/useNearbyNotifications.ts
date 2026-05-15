import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useLocationStore } from '@/store/useLocationStore';
import * as Notifications from 'expo-notifications';

export const useNearbyNotifications = () => {
    const { user: currentUser, profile } = useAuthStore();
    const { currentLocation } = useLocationStore();
    const lastNotifiedIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!currentUser?.id || !currentLocation || !profile?.nearby_notifications_enabled) return;

        const { latitude, longitude } = currentLocation.coords;
        const range = 0.01; // ~1KM

        const channel = supabase
            .channel('nearby-presence')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                },
                async (payload) => {
                    const updatedUser = payload.new;
                    if (updatedUser.id === currentUser.id) return;

                    // Check if updated user is within range
                    const isNearby = 
                        updatedUser.last_lat >= latitude - range &&
                        updatedUser.last_lat <= latitude + range &&
                        updatedUser.last_long >= longitude - range &&
                        updatedUser.last_long <= longitude + range;

                    if (isNearby && !lastNotifiedIds.current.has(updatedUser.id)) {
                        // Send Notification
                        await Notifications.scheduleNotificationAsync({
                            content: {
                                title: "Warrior Nearby! 🚩",
                                body: `${updatedUser.username || 'A warrior'} is active near you.`,
                                data: { userId: updatedUser.id },
                            },
                            trigger: null,
                        });

                        lastNotifiedIds.current.add(updatedUser.id);
                        
                        // Clear from set after 1 hour so they can be notified again later
                        setTimeout(() => {
                            lastNotifiedIds.current.delete(updatedUser.id);
                        }, 3600000);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser, currentLocation, profile?.nearby_notifications_enabled]);
};
