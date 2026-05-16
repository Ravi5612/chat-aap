import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useLocationStore } from '@/store/useLocationStore';

export const useNearbySuggestions = () => {
    const { user: currentUser } = useAuthStore();
    const { currentLocation, startTracking } = useLocationStore();
    const [nearbyPeople, setNearbyPeople] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchNearby = useCallback(async () => {
        if (!currentUser?.id || !currentLocation) return;

        setLoading(true);
        try {
            const { latitude, longitude } = currentLocation.coords;

            // 1KM Radius rough approximation (approx 0.009 degrees per KM)
            const range = 0.01;

            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, last_lat, last_long, gender')
                .neq('id', currentUser.id)
                .gte('last_lat', latitude - range)
                .lte('last_lat', latitude + range)
                .gte('last_long', longitude - range)
                .lte('last_long', longitude + range)
                .limit(10);

            if (!error && data) {
                setNearbyPeople(data);
            }
        } catch (e) {
            console.error('Nearby fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, [currentUser, currentLocation]);

    useEffect(() => {
        if (currentUser?.id) {
            startTracking(currentUser.id);
        }
    }, [currentUser]);

    // Initial fetch and re-fetch when current user moves
    useEffect(() => {
        fetchNearby();
    }, [currentLocation, fetchNearby]);

    // Real-time subscription to listen for updates from OTHER users
    useEffect(() => {
        if (!currentUser?.id) return;

        const channel = supabase
            .channel(`nearby-suggestions-${currentUser.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles'
                },
                (payload) => {
                    // Check if the update is from another user
                    if (payload.new.id !== currentUser.id) {
                        console.log('Nearby Suggestions: Other user moved, re-fetching...');
                        fetchNearby();
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Nearby Suggestions: Real-time channel active');
                }
            });

        return () => {
            console.log('Nearby Suggestions: Cleaning up subscription');
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id, fetchNearby]);

    return { nearbyPeople, loading, refresh: fetchNearby };
};
