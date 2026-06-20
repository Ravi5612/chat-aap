import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import messaging from '@react-native-firebase/messaging';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export const useNotifications = (userId: string | null) => {
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>(undefined);
    const notificationListener = useRef<Notifications.Subscription>();
    const responseListener = useRef<Notifications.Subscription>();
    const router = useRouter();

    useEffect(() => {
        if (!userId) return;

        registerForPushNotificationsAsync().then(token => {
            if (token) {
                setExpoPushToken(token);
                saveTokenToDb(userId, token, 'push_token');
            }
        });

        // Fetch FCM Device Token for reliable Background Calls
        messaging().getToken().then(fcmToken => {
            if (fcmToken) {
                console.log('[PUSH] FCM Token:', fcmToken);
                saveTokenToDb(userId, fcmToken, 'fcm_token');
            }
        }).catch(err => console.error('[PUSH] Failed to get FCM token:', err));

        // Listen for FCM token refreshes
        const unsubscribeOnTokenRefresh = messaging().onTokenRefresh(fcmToken => {
            saveTokenToDb(userId, fcmToken, 'fcm_token');
        });

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            // Foreground notification received
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            if (data?.senderId) {
                const { useFriendsStore } = require('@/store/useFriendsStore');
                const friend = useFriendsStore.getState().combinedItems.find((f: any) => f.id === data.senderId);
                
                if (friend) {
                    const img = typeof friend.img === 'string' ? friend.img : (friend.img?.uri || '');
                    router.push({
                        pathname: '/chat/[id]',
                        params: {
                            id: data.senderId,
                            name: friend.name,
                            isGroup: friend.isGroup ? 'true' : 'false',
                            isLocked: friend.isLocked ? 'true' : 'false',
                            image: img ? encodeURIComponent(img) : undefined
                        }
                    });
                } else {
                    router.push(`/chat/${data.senderId}` as any);
                }
            }
        });

        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
            if (unsubscribeOnTokenRefresh) {
                unsubscribeOnTokenRefresh();
            }
        };
    }, [userId]);

    const saveTokenToDb = async (uid: string, token: string, columnName: 'push_token' | 'fcm_token' = 'push_token') => {
        try {
            // Check current token in DB to avoid unnecessary updates
            const { data } = await supabase
                .from('profiles')
                .select(columnName)
                .eq('id', uid)
                .single();

            if (data?.[columnName] === token) return; // Already saved

            console.log(`[PUSH] Saving new ${columnName} to Supabase:`, token);
            const { error } = await supabase
                .from('profiles')
                .update({ [columnName]: token })
                .eq('id', uid);

            if (error) {
                console.error(`[PUSH] Failed to save ${columnName}:`, error);
            } else {
                console.log(`[PUSH] ${columnName} saved successfully`);
            }
        } catch (error) {
            console.error(`[PUSH] Error saving ${columnName}:`, error);
        }
    };

    const getCounts = { unread: 0 }; // TODO: Implement real unread logic
    return { expoPushToken, getCounts };
};

async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return;
        }
        
        try {
            const projectId =
                Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
            
            if (!projectId) {
                console.warn('Project ID not found');
            }
            
            token = (
                await Notifications.getExpoPushTokenAsync({
                    projectId,
                })
            ).data;
        } catch (e) {
            console.warn('Could not get push token:', e);
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}
