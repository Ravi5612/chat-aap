import { useState, useRef, useEffect, useCallback } from 'react';
import { Audio } from 'expo-av';

export const useStatusMusic = (selectedMusic: any) => {
    const [isMusicPlaying, setIsMusicPlaying] = useState(false);
    const [musicProgress, setMusicProgress] = useState(0);
    const [musicPosition, setMusicPosition] = useState(0);
    const [musicDuration, setMusicDuration] = useState(30000);
    
    const soundRef = useRef<Audio.Sound | null>(null);

    useEffect(() => {
        const playMusic = async () => {
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }
            if (selectedMusic?.url) {
                try {
                    await Audio.setAudioModeAsync({
                        playsInSilentModeIOS: true,
                        staysActiveInBackground: false,
                    });
                    const { sound } = await Audio.Sound.createAsync(
                        { uri: selectedMusic.url },
                        { shouldPlay: true, isLooping: true },
                        (status: any) => {
                            if (status.isLoaded) {
                                setIsMusicPlaying(status.isPlaying);
                                setMusicPosition(status.positionMillis);
                                if (status.durationMillis) {
                                    setMusicDuration(status.durationMillis);
                                    setMusicProgress(status.positionMillis / status.durationMillis);
                                }
                            }
                        }
                    );
                    soundRef.current = sound;
                } catch (error) {
                    console.error("Error playing preview music", error);
                }
            }
        };

        playMusic();

        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync();
                soundRef.current = null;
            }
        };
    }, [selectedMusic]);

    const toggleMusic = useCallback(async () => {
        if (soundRef.current) {
            if (isMusicPlaying) {
                await soundRef.current.pauseAsync();
            } else {
                await soundRef.current.playAsync();
            }
        }
    }, [isMusicPlaying]);

    return {
        isMusicPlaying,
        musicProgress,
        musicPosition,
        musicDuration,
        toggleMusic
    };
};
