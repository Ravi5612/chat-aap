import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import Notifications from '@/utils/safeNotifications';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

// Only set handler if we have the real module or safe mock
try {
    if (Notifications && Notifications.setNotificationHandler) {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });
    }
} catch (e) {
    if (__DEV__) console.warn("Failed to set notification handler");
}

export const showLocalNotification = async (title: string, body: string, data: any = {}) => {
    try {
        await Notifications.scheduleNotificationAsync({
            content: { title, body, data },
            trigger: null, // show immediately
        });
    } catch (e) {
        if (__DEV__) console.warn("Failed to show local notification");
    }
};

export const usePushNotifications = (userId: string | null) => {
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>(undefined);
    const notificationListener = useRef<any>(null);
    const responseListener = useRef<any>(null);
    const router = useRouter();

    useEffect(() => {
        if (!userId) return;

        registerForPushNotificationsAsync().then(token => {
            setExpoPushToken(token);
            if (token) {
                saveTokenToDb(userId, token);
            }
        });

        try {
            notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
                // if (__DEV__) console.log('Notification received:', notification);
            });

            responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
                if (__DEV__) console.log('Notification response:', response);
                const data = response?.notification?.request?.content?.data;
                if (data && data.senderId) {
                    router.push(`/chat/${data.senderId}` as any);
                }
            });
        } catch (e) {
            if (__DEV__) console.warn("Notification listeners failed");
        }

        return () => {
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, [userId]);

    const saveTokenToDb = async (uid: string, token: string) => {
        try {
            const savedToken = await SecureStore.getItemAsync('push_token').catch(() => null);
            if (savedToken === token) return; // Skip if already synced

            if (__DEV__) console.log('[DEBUG] PushNotifications: Saving token to Supabase:', token);
            const { error } = await supabase.from('profiles').update({ push_token: token }).eq('id', uid);
            if (error) {
                if (__DEV__) console.error('[ERROR] PushNotifications: Failed to save token:', error);
            } else {
                await SecureStore.setItemAsync('push_token', token);
                if (__DEV__) console.log('[SUCCESS] PushNotifications: Token saved successfully');
            }
        } catch (error) {
            if (__DEV__) console.error('Error saving push token:', error);
        }
    };

    return { expoPushToken };
};

async function registerForPushNotificationsAsync() {
    let token;
    if (Device.isDevice) {
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                if (__DEV__) console.warn('Failed to get push token for push notification!');
                
                // Prompt user to enable notifications in settings if they haven't
                require('react-native').Alert.alert(
                    'Enable Notifications',
                    'ChatWarriors needs notifications to tell you when you get new messages while the app is closed. Please enable them in your settings.',
                    [
                        { text: 'Later', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => require('react-native').Linking.openSettings() }
                    ]
                );
                return;
            }

            const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
            if (!projectId) {
                if (__DEV__) console.warn('Push Notifications: No projectId found. Token registration skipped.');
            } else {
                token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
            }
        } catch (e) {
            if (__DEV__) console.warn('Push Notifications: Failed to get token. This is expected in Expo Go.', e);
        }
    } else {
        if (__DEV__) console.log('Push Notifications: Must use physical device.');
    }

    if (Platform.OS === 'android') {
        try {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        } catch (e) {
            if (__DEV__) console.warn("Failed to set notification channel");
        }
    }

    return token;
}
