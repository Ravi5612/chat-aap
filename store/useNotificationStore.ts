import { create } from 'zustand';

interface InAppNotification {
    title: string;
    body: string;
    image?: string;
    senderId: string;
    isGroup?: boolean;
}

interface NotificationState {
    currentNotification: InAppNotification | null;
    showNotification: (notification: InAppNotification) => void;
    clearNotification: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    currentNotification: null,
    showNotification: (notification) => set({ currentNotification: notification }),
    clearNotification: () => set({ currentNotification: null }),
}));
