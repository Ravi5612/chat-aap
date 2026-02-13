
// STRICT MODE: Safe wrapper for expo-notifications
// COMPLETELY MOCKED to prevent Expo Go SDK 53+ crashes due to side-effects

console.warn("Using Safe Protected Notifications Wrapper");

const Notifications: any = {
    setNotificationHandler: () => { },
    addNotificationReceivedListener: () => ({ remove: () => { } }),
    addNotificationResponseReceivedListener: () => ({ remove: () => { } }),
    scheduleNotificationAsync: async () => { },
    getPermissionsAsync: async () => ({ status: 'denied' }),
    requestPermissionsAsync: async () => ({ status: 'denied' }),
    getExpoPushTokenAsync: async () => ({ data: null }),
    setNotificationChannelAsync: async () => { },
    AndroidImportance: { MAX: 5 },
    // Mock other potential methods to be safe
    presentNotificationAsync: async () => { },
    dismissNotificationAsync: async () => { },
    cancelAllScheduledNotificationsAsync: async () => { },
};

// We are INTENTIONALLY NOT requiring 'expo-notifications' here
// because even a try-catch require triggers side-effects in the
// module that crash Expo Go immediately.

export default Notifications;
