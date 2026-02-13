import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import Notifications from '@/utils/safeNotifications';

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
    console.warn("Failed to set notification handler");
}

export const usePushNotifications = (userId: string | null) => {
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
    const notificationListener = useRef<any>(null);
    const responseListener = useRef<any>(null);

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
                console.log('Notification received:', notification);
            });

            responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
                console.log('Notification response:', response);
            });
        } catch (e) {
            console.warn("Notification listeners failed");
        }

        return () => {
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, [userId]);

    const saveTokenToDb = async (uid: string, token: string) => {
        try {
            // Update profile with push token so backend can send notifications
            await supabase.from('profiles').update({ push_token: token }).eq('id', uid);
        } catch (error) {
            console.error('Error saving push token:', error);
        }
    };

    const showLocalNotification = async (title: string, body: string, data: any = {}) => {
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data,
                },
                trigger: null, // show immediately
            });
        } catch (e) {
            console.warn("Failed to show local notification");
        }
    };

    return { expoPushToken, showLocalNotification };
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
                // alert('Failed to get push token for push notification!');
                console.warn('Failed to get push token for push notification!');
                return;
            }

            const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
            if (!projectId) {
                console.warn('Push Notifications: No projectId found. Token registration skipped.');
            } else {
                token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
            }
        } catch (e) {
            console.warn('Push Notifications: Failed to get token. This is expected in Expo Go.', e);
        }
    } else {
        console.log('Push Notifications: Must use physical device.');
    }

    if (Platform.OS === 'android') {
        try {
            Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        } catch (e) {
            console.warn("Failed to set notification channel");
        }
    }

    return token;
}
