import { useState, useEffect } from 'react';
import { Audio } from 'expo-av';

export const useStatusPlayback = (
    statuses: any[],
    currentIndex: number,
    currentStatusUI: any,
    viewerVideoRef: React.MutableRefObject<any>,
    paused: boolean
) => {
    const [bgMusic, setBgMusic] = useState<Audio.Sound | null>(null);

    // Video Play/Pause effect
    useEffect(() => {
        if (statuses[currentIndex]?.media_type === 'video' && viewerVideoRef.current) {
            if (paused) viewerVideoRef.current.pauseAsync();
            else viewerVideoRef.current.playAsync();
        }
    }, [paused, currentIndex, statuses]);

    // Handle Music playback
    useEffect(() => {
        let sound: Audio.Sound | null = null;
        
        const playMusic = async () => {
            if (bgMusic) {
                await bgMusic.unloadAsync();
                setBgMusic(null);
            }
            if (currentStatusUI?.audio_url) {
                try {
                    const musicData = JSON.parse(currentStatusUI.audio_url);
                    if (musicData?.url) {
                        const { sound: newSound } = await Audio.Sound.createAsync(
                            { uri: musicData.url },
                            { shouldPlay: !paused, isLooping: true }
                        );
                        sound = newSound;
                        setBgMusic(newSound);
                    }
                } catch(e) {}
            }
        };
        
        if (currentStatusUI) {
            playMusic();
        }

        return () => {
            if (sound) {
                sound.unloadAsync().catch(() => {});
            }
        };
    }, [currentIndex, statuses, currentStatusUI?.id]);

    useEffect(() => {
        if (bgMusic) {
            if (paused) bgMusic.pauseAsync();
            else bgMusic.playAsync();
        }
    }, [paused, bgMusic]);

    return { bgMusic };
};
