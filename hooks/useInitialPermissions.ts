import { useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';

export const useInitialPermissions = () => {
    useEffect(() => {
        const requestAllPermissions = async () => {
            try {
                if (__DEV__) console.log('[PERMISSIONS] Checking initial permissions...');

                // 1. Parallel Check of Existing Permissions (Extremely Fast)
                const [cameraRes, audioRes, libraryRes, notifRes] = await Promise.all([
                    Camera.getCameraPermissionsAsync(),
                    Audio.getPermissionsAsync(),
                    ImagePicker.getMediaLibraryPermissionsAsync(),
                    Notifications.getPermissionsAsync()
                ]);

                let cameraStatus = cameraRes.status;
                let audioStatus = audioRes.status;
                let libraryStatus = libraryRes.status;
                let notifStatus = notifRes.status;

                // 2. Sequentially Request Only Missing Permissions
                // (To prevent OS popup crashing which happens if we use Promise.all for requests)
                if (cameraStatus !== 'granted') {
                    const res = await Camera.requestCameraPermissionsAsync();
                    cameraStatus = res.status;
                }
                if (audioStatus !== 'granted') {
                    const res = await Audio.requestPermissionsAsync();
                    audioStatus = res.status;
                }
                if (libraryStatus !== 'granted') {
                    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    libraryStatus = res.status;
                }
                if (notifStatus !== 'granted') {
                    const res = await Notifications.requestPermissionsAsync();
                    notifStatus = res.status;
                }

                if (__DEV__) {
                    console.log('[PERMISSIONS] Camera:', cameraStatus);
                    console.log('[PERMISSIONS] Audio:', audioStatus);
                    console.log('[PERMISSIONS] Media Library:', libraryStatus);
                    console.log('[PERMISSIONS] Notifications:', notifStatus);
                }

                if (cameraStatus !== 'granted' || libraryStatus !== 'granted' || audioStatus !== 'granted') {
                    if (__DEV__) console.warn('[PERMISSIONS] Some permissions were denied. Some features might not work.');
                    Alert.alert(
                        'Permissions Required', 
                        'Some permissions were denied. Core features like sending photos, voice notes, and video calls will not work properly until you enable them in your device settings.',
                        [{ text: 'OK' }]
                    );
                }

            } catch (error) {
                if (__DEV__) console.error('[PERMISSIONS] Error requesting permissions:', error);
            }
        };

        // Removed arbitrary 1500ms delay. 
        // Checking permissions natively is async and won't block the splash screen.
        requestAllPermissions();
        
    }, []);
};
