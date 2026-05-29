import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useLocationStore } from '@/store/useLocationStore';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const NEARBY_RADIUS_KM = 1.0;
const REFRESH_INTERVAL_MS = 60000; // 1 minute smart poll

export const useNearbySuggestions = () => {
    const { user: currentUser } = useAuthStore();
    const currentUserId = currentUser?.id || '';
    const { currentLocation, startTracking } = useLocationStore();
    
    const [nearbyPeople, setNearbyPeople] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Refs to prevent dependency loops
    const locationRef = useRef(currentLocation);
    const lastFetchLocationRef = useRef<{lat: number, lon: number} | null>(null);

    useEffect(() => {
        locationRef.current = currentLocation;
    }, [currentLocation]);

    const fetchNearby = useCallback(async () => {
        if (!currentUserId || !locationRef.current) return;

        setLoading(true);
        try {
            const { latitude, longitude } = locationRef.current.coords;
            lastFetchLocationRef.current = { lat: latitude, lon: longitude };

            // 1.2 KM rough bounding box (approx 0.012 degrees) to fetch candidates from DB quickly
            const boxRange = 0.012;

            // 1. Parallelly fetch relationships to exclude them
            const [friendsRes, requestsRes] = await Promise.all([
                supabase
                    .from('friendships')
                    .select('user_id, friend_id')
                    .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`),
                supabase
                    .from('friend_requests')
                    .select('sender_id, receiver_id, status')
                    .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
            ]);

            const excludeIds = new Set<string>();
            excludeIds.add(currentUserId);
            
            // Add friends to exclude list
            friendsRes.data?.forEach(f => {
                if (f.user_id === currentUserId) excludeIds.add(f.friend_id);
                if (f.friend_id === currentUserId) excludeIds.add(f.user_id);
            });

            // Add pending/accepted requests to exclude list
            const sentRequestIds = new Set<string>();
            requestsRes.data?.forEach(r => {
                if (r.status !== 'rejected') {
                    if (r.sender_id === currentUserId) {
                        excludeIds.add(r.receiver_id);
                        sentRequestIds.add(r.receiver_id);
                    }
                    if (r.receiver_id === currentUserId) {
                        excludeIds.add(r.sender_id);
                    }
                }
            });

            // 2. Fetch profiles within rough bounding box that are currently online
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, last_lat, last_long, gender, is_online')
                .eq('is_online', true)
                .neq('id', currentUserId)
                .gte('last_lat', latitude - boxRange)
                .lte('last_lat', latitude + boxRange)
                .gte('last_long', longitude - boxRange)
                .lte('last_long', longitude + boxRange)
                .limit(50);

            if (!error && data) {
                // 3. Filter using accurate Haversine circular distance AND exclude existing friends
                const filtered = data
                    .filter(person => {
                        if (excludeIds.has(person.id) || !person.last_lat || !person.last_long) return false;
                        const dist = haversineDistance(latitude, longitude, person.last_lat, person.last_long);
                        return dist <= NEARBY_RADIUS_KM; // True circle!
                    })
                    .map(person => ({
                        ...person,
                        requestStatus: sentRequestIds.has(person.id) ? 'pending' : null
                    }));
                
                setNearbyPeople(filtered.slice(0, 10)); // Top 10 nearest
            }
        } catch (e) {
            if (__DEV__) console.error('Nearby fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, [currentUserId]);

    // Initial boot
    useEffect(() => {
        if (currentUserId) {
            startTracking(currentUserId);
            fetchNearby();
        }
    }, [currentUserId, fetchNearby, startTracking]);

    // Re-fetch dynamically only if user moves more than 100 meters
    useEffect(() => {
        if (!currentLocation) return;
        
        const lastLoc = lastFetchLocationRef.current;
        if (lastLoc) {
            const dist = haversineDistance(
                lastLoc.lat, 
                lastLoc.lon, 
                currentLocation.coords.latitude, 
                currentLocation.coords.longitude
            );
            
            // If moved > 100 meters (0.1 KM), fetch new nearby users
            if (dist > 0.1) {
                if (__DEV__) console.log('[NearbySuggestions] Moved > 100m, re-fetching...');
                fetchNearby();
            }
        }
    }, [currentLocation, fetchNearby]);

    // Smart Interval Polling (Replaces dangerous unfiltered DB subscription)
    // Runs every 1 minute to check for new people who walked into your range.
    useEffect(() => {
        if (!currentUserId) return;
        const intervalId = setInterval(() => {
            fetchNearby();
        }, REFRESH_INTERVAL_MS);
        
        return () => clearInterval(intervalId);
    }, [currentUserId, fetchNearby]);

    return { nearbyPeople, loading, refresh: fetchNearby };
};
