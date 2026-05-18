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

            // 1. Parallelly fetch relationships (friends, sent requests, received requests) to exclude them
            const [friendsRes, sentRequestsRes, receivedRequestsRes] = await Promise.all([
                supabase
                    .from('friendships')
                    .select('user_id, friend_id')
                    .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`),
                supabase
                    .from('friend_requests')
                    .select('receiver_id')
                    .eq('sender_id', currentUser.id)
                    .in('status', ['pending', 'accepted']),
                supabase
                    .from('friend_requests')
                    .select('sender_id')
                    .eq('receiver_id', currentUser.id)
                    .in('status', ['pending', 'accepted'])
            ]);

            // Create set of all IDs to filter out (including current user)
            const excludeIds = new Set<string>([currentUser.id]);
            
            friendsRes.data?.forEach(f => {
                if (f.user_id === currentUser.id) excludeIds.add(f.friend_id);
                else excludeIds.add(f.user_id);
            });
            receivedRequestsRes.data?.forEach(r => excludeIds.add(r.sender_id));

            const sentRequestIds = new Set(sentRequestsRes.data?.map(r => r.receiver_id) || []);

            // 2. Fetch profiles within 1KM radius that are currently online
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, last_lat, last_long, gender, is_online')
                .eq('is_online', true)
                .neq('id', currentUser.id)
                .gte('last_lat', latitude - range)
                .lte('last_lat', latitude + range)
                .gte('last_long', longitude - range)
                .lte('last_long', longitude + range)
                .limit(50); // Fetch more so we have plenty after filtering client-side

            if (!error && data) {
                // 3. Filter out existing friends, incoming requests, and self client-side
                const filtered = data
                    .filter(person => !excludeIds.has(person.id))
                    .map(person => ({
                        ...person,
                        requestStatus: sentRequestIds.has(person.id) ? 'pending' : null
                    }));
                setNearbyPeople(filtered.slice(0, 10)); // limit to top 10
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
