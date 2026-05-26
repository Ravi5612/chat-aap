import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';

export const useTonePlayer = () => {
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [sound, setSound] = useState<Audio.Sound | null>(null);

    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync().catch(() => {});
            }
        };
    }, [sound]);

    const playSound = async (id: string, url: string) => {
        try {
            if (sound) {
                await sound.unloadAsync();
            }
            setPlayingId(id);
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: url },
                { shouldPlay: true }
            );
            setSound(newSound);
            newSound.setOnPlaybackStatusUpdate((status: any) => {
                if (status.didJustFinish) {
                    setPlayingId(null);
                    newSound.unloadAsync().catch(() => {});
                }
            });
        } catch (error) {
            console.error('Error playing sound', error);
            setPlayingId(null);
            Alert.alert('Error', 'Could not play this tone.');
        }
    };

    const stopSound = async () => {
        if (sound) {
            await sound.stopAsync();
            setPlayingId(null);
        }
    };

    return {
        playingId,
        playSound,
        stopSound
    };
};
