import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useEmergencyStore } from '@/store/useEmergencyStore';
import * as Location from 'expo-location';

// Haversine formula to calculate distance in KM
const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const useEmergencySystem = () => {
    const user = useAuthStore(state => state.user);
    const profile = useAuthStore(state => state.profile);
    const setActiveEmergency = useEmergencyStore(state => state.setActiveEmergency);

    useEffect(() => {
        // Only run listener if user is logged in and is a warrior
        if (!user || !profile?.is_warrior) return;

        console.log('[SOS] Emergency listener started for Warrior:', user.id);

        const emergencyChannel = supabase.channel('public:emergencies');

        emergencyChannel.on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'emergencies' },
            async (payload) => {
                const emergency = payload.new;

                // Ignore if it's our own emergency
                if (emergency.user_id === user.id) return;

                try {
                    // 1. Get our current location
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status !== 'granted') return;

                    const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    
                    // 2. Calculate Distance
                    const distance = getDistanceFromLatLonInKm(
                        currentLocation.coords.latitude,
                        currentLocation.coords.longitude,
                        emergency.latitude,
                        emergency.longitude
                    );

                    console.log(`[SOS] New Emergency! Distance: ${distance.toFixed(2)} km`);

                    // 3. If within 5 KM, trigger the alert
                    if (distance <= 5) {
                        // Fetch victim details
                        const { data: victimProfile } = await supabase
                            .from('profiles')
                            .select('username, phone, email')
                            .eq('id', emergency.user_id)
                            .single();

                        if (victimProfile) {
                            setActiveEmergency({
                                id: emergency.id,
                                user_id: emergency.user_id,
                                latitude: emergency.latitude,
                                longitude: emergency.longitude,
                                share_phone: emergency.share_phone,
                                share_email: emergency.share_email,
                                created_at: emergency.created_at,
                                victim_name: victimProfile.username,
                                victim_phone: victimProfile.phone,
                                victim_email: victimProfile.email,
                                distance_km: distance
                            });
                        }
                    }
                } catch (err) {
                    console.error('[SOS] Error processing emergency:', err);
                }
            }
        ).subscribe();

        return () => {
            supabase.removeChannel(emergencyChannel);
        };
    }, [user, profile?.is_warrior]);
};
