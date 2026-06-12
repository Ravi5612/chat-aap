import { create } from 'zustand';
import { AppStorage } from '@/lib/storage';

interface SettingsState {
    autoDownloadPhotos: boolean;
    autoDownloadVideos: boolean;
    autoDownloadAudio: boolean;
    autoDownloadDocuments: boolean;
    loadSettings: () => Promise<void>;
    toggleSetting: (key: 'autoDownloadPhotos' | 'autoDownloadVideos' | 'autoDownloadAudio' | 'autoDownloadDocuments', value: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
    autoDownloadPhotos: true,
    autoDownloadVideos: false,
    autoDownloadAudio: true,
    autoDownloadDocuments: true,

    loadSettings: async () => {
        try {
            const settingsJson = await AppStorage.getItemAsync('app_settings');
            if (settingsJson) {
                const settings = JSON.parse(settingsJson);
                set((state) => ({ ...state, ...settings }));
            }
        } catch (error) {
            console.error('Failed to load settings from storage', error);
        }
    },

    toggleSetting: async (key, value) => {
        set({ [key]: value });
        try {
            // Save updated state to storage
            const currentState = get();
            const settingsToSave = {
                autoDownloadPhotos: currentState.autoDownloadPhotos,
                autoDownloadVideos: currentState.autoDownloadVideos,
                autoDownloadAudio: currentState.autoDownloadAudio,
                autoDownloadDocuments: currentState.autoDownloadDocuments,
            };
            await AppStorage.setItemAsync('app_settings', JSON.stringify(settingsToSave));
        } catch (error) {
            console.error('Failed to save settings to storage', error);
        }
    }
}));
