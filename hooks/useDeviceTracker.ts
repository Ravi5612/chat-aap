import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import * as Network from 'expo-network';
import * as Cellular from 'expo-cellular';
import { supabase } from '@/lib/supabase';
import { AppStorage } from '@/lib/storage';
import { useAuthStore } from '@/store/useAuthStore';

export const useDeviceTracker = () => {
    const user = useAuthStore(state => state.user);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const trackDevice = async () => {
            if (!user?.id) return;
            
            try {
                // 1. Check if tracker is enabled for this device
                const isTrackerEnabled = await AppStorage.getItemAsync('tracker_enabled');
                if (isTrackerEnabled !== 'true') return;

                const deviceId = await AppStorage.getItemAsync('unique_device_id');
                if (!deviceId) return;

                // 2. Request / Check Location Permissions
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;

                // 3. Get Current Location
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });

                // 4. Get Battery Status
                const batteryLevel = await Battery.getBatteryLevelAsync();
                const batteryState = await Battery.getBatteryStateAsync();
                const isCharging = batteryState === Battery.BatteryState.CHARGING || batteryState === Battery.BatteryState.FULL;

                // 5. Get Network & SIM Info
                const networkState = await Network.getNetworkStateAsync();
                const ipAddress = await Network.getIpAddressAsync().catch(() => 'Unknown IP');
                const carrier = await Cellular.getCarrierNameAsync().catch(() => 'No SIM / Unknown');
                let networkType = 'Unknown';
                if (networkState.type === Network.NetworkStateType.WIFI) networkType = 'Wi-Fi';
                if (networkState.type === Network.NetworkStateType.CELLULAR) networkType = 'Mobile Data';

                // 6. Update Supabase Database
                const { error } = await supabase.from('user_devices').update({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    battery_level: Math.round(batteryLevel * 100),
                    is_charging: isCharging,
                    network_type: networkType,
                    ip_address: ipAddress,
                    sim_carrier: carrier
                }).eq('user_id', user.id).eq('device_id', deviceId);

                if (error) {
                    console.warn('[useDeviceTracker] Failed to update device stats:', error);
                } else {
                    console.log('[useDeviceTracker] Device stats synced to server');
                }

            } catch (error) {
                console.log('[useDeviceTracker] Error tracking device:', error);
            }
        };

        // Run immediately on mount
        trackDevice();

        // Then run every 2 minutes (120000 ms) while app is open
        intervalRef.current = setInterval(trackDevice, 120000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [user?.id]);
};
