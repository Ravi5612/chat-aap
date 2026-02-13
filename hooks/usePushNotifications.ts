import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

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

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('Notification received:', notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Notification response:', response);
            // Handle navigation here if needed
        });

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
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
            },
            trigger: null, // show immediately
        });
    };

    return { expoPushToken, showLocalNotification };
};

async function registerForPushNotificationsAsync() {
    let token;
    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            alert('Failed to get push token for push notification!');
            return;
        }

        try {
            const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
            if (!projectId) {
                console.warn('Push Notifications: No projectId found. Token registration skipped. Please configure EAS Project ID in app.json for production.');
                return;
            }
            token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        } catch (e) {
            console.warn('Push Notifications: Failed to get token. This is expected in some development environments.', e);
        }
    } else {
        console.log('Push Notifications: Must use physical device.');
    }

    if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    return token;
}
