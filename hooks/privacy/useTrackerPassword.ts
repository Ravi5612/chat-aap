import { useState, useEffect } from 'react';
import { AppStorage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export const useTrackerPassword = () => {
    const { user } = useAuthStore();
    const [trackerEnabled, setTrackerEnabled] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [pendingToggleValue, setPendingToggleValue] = useState<boolean | null>(null);

    useEffect(() => {
        const loadTrackerState = async () => {
            const state = await AppStorage.getItemAsync('tracker_enabled');
            setTrackerEnabled(state === 'true');
        };
        loadTrackerState();
    }, []);

    const handleToggleAttempt = (newValue: boolean) => {
        setPendingToggleValue(newValue);
        setPasswordInput('');
        setShowPasswordModal(true);
    };

    const verifyPasswordAndToggle = async () => {
        if (!passwordInput.trim() || !user?.email || pendingToggleValue === null) return;
        
        setIsVerifying(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: passwordInput
            });

            if (error) {
                alert('Incorrect password. Please try again.');
                setIsVerifying(false);
                return;
            }

            const newValue = pendingToggleValue;
            setTrackerEnabled(newValue);
            await AppStorage.setItemAsync('tracker_enabled', newValue ? 'true' : 'false');
            
            const deviceId = await AppStorage.getItemAsync('unique_device_id');
            if (deviceId) {
                await supabase.from('user_devices').update({ is_tracker_enabled: newValue }).eq('user_id', user.id).eq('device_id', deviceId);
            }
            
            setShowPasswordModal(false);
        } catch (err) {
            alert('Something went wrong verifying your password.');
        } finally {
            setIsVerifying(false);
        }
    };

    return {
        trackerEnabled,
        showPasswordModal,
        setShowPasswordModal,
        passwordInput,
        setPasswordInput,
        isVerifying,
        pendingToggleValue,
        setPendingToggleValue,
        handleToggleAttempt,
        verifyPasswordAndToggle
    };
};
