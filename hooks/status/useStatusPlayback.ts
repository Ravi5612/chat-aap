import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

export const useStatusPlayback = (
    statuses: any[],
    currentIndex: number,
    currentStatusUI: any,
    viewerVideoRef: React.MutableRefObject<any>,
    paused: boolean
) => {
    // Use a ref so cleanup always has access to the latest sound instance
    const bgMusicRef = useRef<Audio.Sound | null>(null);

    // Video Play/Pause effect
    useEffect(() => {
        if (statuses[currentIndex]?.media_type === 'video' && viewerVideoRef.current) {
            if (paused) viewerVideoRef.current.pauseAsync();
            else viewerVideoRef.current.playAsync();
        }
    }, [paused, currentIndex, statuses]);

    // Handle Music playback - runs when status changes
    useEffect(() => {
        let isMounted = true;

        const playMusic = async () => {
            // Always stop & unload previous music first
            if (bgMusicRef.current) {
                try {
                    await bgMusicRef.current.stopAsync();
                    await bgMusicRef.current.unloadAsync();
                } catch (e) {}
                bgMusicRef.current = null;
            }

            if (!isMounted) return;

            if (currentStatusUI?.audio_url) {
                try {
                    const musicData = JSON.parse(currentStatusUI.audio_url);
                    if (musicData?.url) {
                        const { sound: newSound } = await Audio.Sound.createAsync(
                            { uri: musicData.url },
                            { shouldPlay: !paused, isLooping: true }
                        );
                        if (isMounted) {
                            bgMusicRef.current = newSound;
                        } else {
                            // Component unmounted before sound loaded, clean it up
                            await newSound.unloadAsync();
                        }
                    }
                } catch (e) {}
            }
        };

        playMusic();

        // Cleanup: runs when status changes OR component unmounts
        return () => {
            isMounted = false;
            if (bgMusicRef.current) {
                bgMusicRef.current.stopAsync()
                    .then(() => bgMusicRef.current?.unloadAsync())
                    .catch(() => {})
                    .finally(() => { bgMusicRef.current = null; });
            }
        };
    }, [currentIndex, currentStatusUI?.id]);

    // Pause/Resume music when user holds screen
    useEffect(() => {
        if (bgMusicRef.current) {
            if (paused) bgMusicRef.current.pauseAsync().catch(() => {});
            else bgMusicRef.current.playAsync().catch(() => {});
        }
    }, [paused]);

    return {};
};
