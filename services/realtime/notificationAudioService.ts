import { Audio } from 'expo-av';

const DEFAULT_MESSAGE_TONE = 'https://raw.githubusercontent.com/Anshuman71/chat-app/master/client/src/assets/notification.mp3';

let globalSoundInstance: Audio.Sound | null = null;
let globalSoundUrl: string | null = null; // ✅ Track loaded URL to reuse instance
let isAudioConfigured = false;

export const playMessageSound = async (customTone?: string) => {
    try {
        // Configure audio mode only once
        if (!isAudioConfigured) {
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                playThroughEarpieceAndroid: false, // fixed property name
            } as any);
            isAudioConfigured = true;
        }

        const soundUrl = customTone || DEFAULT_MESSAGE_TONE;

        // ✅ Reuse existing instance if same URL — avoids expensive createAsync on every message
        if (globalSoundInstance && globalSoundUrl === soundUrl) {
            await globalSoundInstance.setPositionAsync(0);
            await globalSoundInstance.playAsync();
            return;
        }

        // URL changed or first load — unload old, create new persistent instance
        if (globalSoundInstance) {
            await globalSoundInstance.unloadAsync().catch(() => {});
            globalSoundInstance = null;
            globalSoundUrl = null;
        }

        if (__DEV__) console.log('[DEBUG] GlobalRealtime: Loading sound:', soundUrl);
        const { sound } = await Audio.Sound.createAsync(
            { uri: soundUrl },
            { shouldPlay: true, volume: 1.0 }
        );

        globalSoundInstance = sound;
        globalSoundUrl = soundUrl;
    } catch (error) {
        if (__DEV__) console.error('[ERROR] GlobalRealtime: Error playing message sound:', error);
    }
};
