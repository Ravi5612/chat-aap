import { useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import * as Contacts from 'expo-contacts';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';

export const useInitialPermissions = () => {
    useEffect(() => {
        const requestAllPermissions = async () => {
            try {
                console.log('[PERMISSIONS] Requesting initial permissions...');

                // 1. Camera Permission
                const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
                console.log('[PERMISSIONS] Camera:', cameraStatus);

                // 2. Microphone Permission
                const { status: audioStatus } = await Audio.requestPermissionsAsync();
                console.log('[PERMISSIONS] Audio:', audioStatus);

                // 3. Media Library (Gallery) Permission
                const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                console.log('[PERMISSIONS] Media Library:', libraryStatus);

                // 4. Contacts Permission
                const { status: contactsStatus } = await Contacts.requestPermissionsAsync();
                console.log('[PERMISSIONS] Contacts:', contactsStatus);

                // 5. Notifications Permission
                const { status: notifStatus } = await Notifications.requestPermissionsAsync();
                console.log('[PERMISSIONS] Notifications:', notifStatus);

                if (
                    cameraStatus !== 'granted' || 
                    libraryStatus !== 'granted' || 
                    audioStatus !== 'granted'
                ) {
                    // Don't block the user, but warn them
                    console.warn('[PERMISSIONS] Some permissions were denied. Some features might not work.');
                }

            } catch (error) {
                console.error('[PERMISSIONS] Error requesting permissions:', error);
            }
        };

        // Run after a short delay to not block splash screen
        const timer = setTimeout(() => {
            requestAllPermissions();
        }, 1500);

        return () => clearTimeout(timer);
    }, []);
};
