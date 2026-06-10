import { useState, useCallback } from 'react';
import { Keyboard, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { useFriendsStore } from '@/store/useFriendsStore';

export const useVaultAuth = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const vaultPasscode = useFriendsStore(state => state.vaultPasscode);
    const setVaultOpen = useFriendsStore(state => state.setVaultOpen);

    const handleSearchChange = useCallback(async (text: string) => {
        if (vaultPasscode && text === vaultPasscode) {
            setSearchQuery('');
            Keyboard.dismiss();
            
            try {
                const hasHardware = await LocalAuthentication.hasHardwareAsync();
                const isEnrolled = await LocalAuthentication.isEnrolledAsync();

                if (hasHardware && isEnrolled) {
                    const result = await LocalAuthentication.authenticateAsync({
                        promptMessage: 'Unlock Ninja Vault',
                        fallbackLabel: 'Use Device Passcode',
                        disableDeviceFallback: false,
                    });
                    
                    if (result.success) {
                        setVaultOpen(true);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } else {
                        Alert.alert('Access Denied', 'Authentication failed.');
                    }
                } else {
                    setVaultOpen(true);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            } catch (err) {
                console.error("Local auth error:", err);
                Alert.alert('Error', 'Authentication encountered an error.');
            }
        } else {
            setSearchQuery(text);
        }
    }, [vaultPasscode, setVaultOpen]);

    return {
        searchQuery,
        setSearchQuery,
        handleSearchChange
    };
};
