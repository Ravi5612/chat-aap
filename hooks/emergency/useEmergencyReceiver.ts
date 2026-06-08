import { useState, useEffect } from 'react';
import { Vibration, Alert, Linking } from 'react-native';
import { useEmergencyStore } from '@/store/useEmergencyStore';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

const VIBRATION_PATTERN = [0, 1000, 500, 1000, 500, 1000, 500, 1000];

export const useEmergencyReceiver = () => {
    const { user } = useAuthStore();
    const { activeEmergency, isVibrating, stopVibration, setActiveEmergency } = useEmergencyStore();
    const [isHelping, setIsHelping] = useState(false);

    useEffect(() => {
        if (isVibrating) {
            Vibration.vibrate(VIBRATION_PATTERN, true);
        } else {
            Vibration.cancel();
        }
        return () => Vibration.cancel();
    }, [isVibrating]);

    const handleIgnore = async () => {
        if (!activeEmergency || !user) return;
        stopVibration();
        await supabase.from('emergency_responses').insert({
            emergency_id: activeEmergency.id,
            warrior_id: user.id,
            status: 'ignored'
        });
        setActiveEmergency(null);
        setIsHelping(false);
    };

    const handleAcceptHelp = async () => {
        if (!activeEmergency || !user) return;
        stopVibration();
        await supabase.from('emergency_responses').insert({
            emergency_id: activeEmergency.id,
            warrior_id: user.id,
            status: 'helping'
        });
        setIsHelping(true);
    };

    const handleIHelped = async () => {
        if (!activeEmergency || !user) return;
        await supabase.from('emergency_responses').update({ status: 'completed' })
            .eq('emergency_id', activeEmergency.id)
            .eq('warrior_id', user.id);
            
        Alert.alert('Mission Pending Verification', 'The user has been asked to verify your help. Once they verify, you will get the award!');
        setActiveEmergency(null);
        setIsHelping(false);
    };

    const openMaps = () => {
        if (!activeEmergency) return;
        const url = `https://www.google.com/maps/search/?api=1&query=${activeEmergency.latitude},${activeEmergency.longitude}`;
        Linking.openURL(url);
    };

    return {
        user,
        activeEmergency,
        isHelping,
        handleIgnore,
        handleAcceptHelp,
        handleIHelped,
        openMaps
    };
};
