import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';
import { StoreGet } from './authTypes';

let killSwitchInterval: any = null;

export const clearKillSwitch = () => {
    if (killSwitchInterval) {
        clearInterval(killSwitchInterval);
        killSwitchInterval = null;
    }
};

export const createDeviceActions = (set: any, get: StoreGet) => ({
    syncDevice: async () => {
        const { user, signOut } = get();
        if (!user?.id) return;

        try {
            let deviceId = await AsyncStorage.getItem('unique_device_id');
            if (!deviceId) {
                deviceId = Crypto.randomUUID();
                await AsyncStorage.setItem('unique_device_id', deviceId);
            }

            const deviceName = Device.modelName || Device.deviceName || 'Unknown Device';
            const osVersion = `${Device.osName || 'OS'} ${Device.osVersion || ''}`.trim();

            // Defer network-heavy operations so they don't compete with startup
            setTimeout(async () => {
                let lastLocation = 'Unknown Location';
                try {
                    const cachedLoc = await AsyncStorage.getItem('device_location_cache');
                    const cachedTime = await AsyncStorage.getItem('device_location_time');
                    const now = Date.now();
                    if (cachedLoc && cachedTime && (now - parseInt(cachedTime)) < 24 * 60 * 60 * 1000) {
                        lastLocation = cachedLoc;
                    } else {
                        const response = await fetch('https://ipapi.co/json/');
                        if (response.ok) {
                            const data = await response.json();
                            if (data.city && data.country_name) {
                                lastLocation = `${data.city}, ${data.country_name}`;
                                await AsyncStorage.setItem('device_location_cache', lastLocation);
                                await AsyncStorage.setItem('device_location_time', now.toString());
                            }
                        }
                    }
                } catch (err) {
                    console.warn('[syncDevice] Location fetch failed:', err);
                    const cachedLoc = await AsyncStorage.getItem('device_location_cache');
                    if (cachedLoc) lastLocation = cachedLoc;
                }

                const { error } = await supabase.from('user_devices').upsert({
                    user_id: user.id,
                    device_id: deviceId,
                    device_name: deviceName,
                    os_version: osVersion,
                    last_location: lastLocation,
                    last_active: new Date().toISOString(),
                    is_active: true
                }, { onConflict: 'user_id,device_id' });

                if (error) {
                    console.warn('[syncDevice] Supabase Upsert error:', error);
                }
            }, 5000);

            if (killSwitchInterval) clearInterval(killSwitchInterval);
            killSwitchInterval = setInterval(async () => {
                const currentUser = get().user;
                if (!currentUser?.id) return;
                
                try {
                    const { data, error } = await supabase
                        .from('user_devices')
                        .select('is_active')
                        .eq('user_id', currentUser.id)
                        .eq('device_id', deviceId)
                        .single();
                        
                    if (data && data.is_active === false) {
                        console.log('🚨 REMOTE LOGOUT INITIATED 🚨');
                        signOut();
                        alert('You have been logged out remotely from another device.');
                    }
                } catch (e) {
                }
            }, 60000);

        } catch (error) {
            console.error('[syncDevice] Master Error:', error);
        }
    }
});
