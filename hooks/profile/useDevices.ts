import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { getLinkedDevices, logoutDevice, getCurrentDeviceId } from '@/services/profile/deviceService';

export const useDevices = (currentUser: any) => {
    const [devices, setDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

    const loadDevices = useCallback(async () => {
        if (!currentUser?.id) return;
        setLoading(true);
        try {
            const localDeviceId = await getCurrentDeviceId();
            setCurrentDeviceId(localDeviceId);
            
            const data = await getLinkedDevices(currentUser.id);
            setDevices(data);
        } catch (error) {
            console.error('Error fetching devices:', error);
            Alert.alert('Error', 'Failed to load linked devices');
        } finally {
            setLoading(false);
        }
    }, [currentUser?.id]);

    useEffect(() => {
        loadDevices();
    }, [loadDevices]);

    const handleRemoteLogout = useCallback((device: any) => {
        Alert.alert(
            'Log Out Device',
            `Are you sure you want to log out of ${device.device_name}? This will instantly lock the app on that device.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await logoutDevice(device.id);
                            setDevices(prev => prev.filter(d => d.id !== device.id));
                            Alert.alert('Success', 'Device has been logged out successfully.');
                        } catch (error) {
                            console.error('Remote logout error:', error);
                            Alert.alert('Error', 'Failed to log out device.');
                        }
                    }
                }
            ]
        );
    }, []);

    return {
        devices,
        loading,
        currentDeviceId,
        handleRemoteLogout
    };
};
