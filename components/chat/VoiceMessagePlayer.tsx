import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

interface VoiceMessagePlayerProps {
    uri: string;
    isCurrentUser: boolean;
}

// Symmetrical, premium voice note soundwave levels
const WAVE_HEIGHTS = [4, 8, 14, 20, 16, 10, 14, 22, 28, 20, 12, 18, 24, 18, 12, 8, 14, 20, 16, 10, 6, 4];

const formatTime = (millis: number) => {
    const totalSeconds = millis / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default React.memo(function VoiceMessagePlayer({ uri, isCurrentUser }: VoiceMessagePlayerProps) {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const onPlaybackStatusUpdate = React.useCallback((status: any) => {
        if (status.isLoaded) {
            setDuration(status.durationMillis || 0);
            setPosition(status.positionMillis || 0);
            setIsPlaying(status.isPlaying);
            
            if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(status.durationMillis || 0);
            }
        }
    }, []);

    // On mount, load the sound and keep it ready for instant playback
    useEffect(() => {
        let active = true;
        
        const initSound = async () => {
            if (!uri) return;
            try {
                const { sound: newSound, status } = await Audio.Sound.createAsync(
                    { uri },
                    { shouldPlay: false },
                    onPlaybackStatusUpdate
                );
                
                if (active) {
                    setSound(newSound);
                    setIsLoading(false);
                    if (status.isLoaded) {
                        setDuration(status.durationMillis || 0);
                    }
                } else {
                    newSound.unloadAsync();
                }
            } catch (error) {
                console.warn('[VOICE_PLAYER] Init failed:', error);
                if (active) setIsLoading(false);
            }
        };

        initSound();

        return () => {
            active = false;
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [uri, onPlaybackStatusUpdate]); // sound is not a dependency here because it's set inside

    const playPause = React.useCallback(async () => {
        if (isLoading || !sound) return;

        try {
            if (isPlaying) {
                await sound.pauseAsync();
            } else {
                if (position >= duration && duration > 0) {
                    await sound.setPositionAsync(0);
                }
                await sound.playAsync();
            }
        } catch (error) {
            console.error('[VOICE_PLAYER] Play/Pause error:', error);
        }
    }, [isLoading, sound, isPlaying, position, duration]);

    const progress = duration > 0 ? (position / duration) * 100 : 0;

    return (
        <View style={styles.container}>
            {/* Play/Pause Button */}
            <TouchableOpacity
                onPress={playPause}
                style={[
                    styles.playBtn,
                    isCurrentUser ? styles.playBtnUser : styles.playBtnOther
                ]}
                activeOpacity={0.8}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color={isCurrentUser ? "white" : "#F68537"} />
                ) : (
                    <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={20}
                        color={isCurrentUser ? "white" : "#FFFFFF"}
                        style={{ marginLeft: isPlaying ? 0 : 2 }}
                    />
                )}
            </TouchableOpacity>

            <View style={styles.rightContent}>
                {/* Waveform */}
                <View style={styles.waveContainer}>
                    {WAVE_HEIGHTS.map((h, i) => {
                        const barProgress = (i / WAVE_HEIGHTS.length) * 100;
                        const isActive = progress >= barProgress;
                        
                        let bgColor = 'rgba(0,0,0,0.2)';
                        if (isCurrentUser) {
                            bgColor = isActive ? '#FFFFFF' : 'rgba(255,255,255,0.4)';
                        } else {
                            bgColor = isActive ? '#F68537' : 'rgba(246,133,55,0.2)';
                        }

                        return (
                            <View
                                key={i}
                                style={[
                                    styles.waveBar,
                                    { height: h, backgroundColor: bgColor }
                                ]}
                            />
                        );
                    })}
                </View>

                {/* Timers & Indicators */}
                <View style={styles.metaContainer}>
                    <View style={styles.timeWrap}>
                        <Text style={[styles.timeText, isCurrentUser ? styles.textLight : styles.textDark]}>
                            {formatTime(position)}
                        </Text>
                    </View>
                    <Text style={[styles.durationText, isCurrentUser ? styles.textDimLight : styles.textDimDark]}>
                        {formatTime(duration || 0)}
                    </Text>
                </View>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 2,
        width: 230,
        gap: 12,
    },
    playBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
    },
    playBtnUser: {
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    playBtnOther: {
        backgroundColor: '#F68537',
    },
    rightContent: {
        flex: 1,
        justifyContent: 'center',
    },
    waveContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 30,
        gap: 2.5,
    },
    waveBar: {
        width: 3,
        borderRadius: 1.5,
    },
    metaContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    timeWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timeText: {
        fontSize: 11,
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
    },
    durationText: {
        fontSize: 11,
        fontWeight: '500',
        fontVariant: ['tabular-nums'],
    },
    textLight: {
        color: '#FFFFFF',
    },
    textDark: {
        color: '#1F2937',
    },
    textDimLight: {
        color: 'rgba(255,255,255,0.7)',
    },
    textDimDark: {
        color: '#9CA3AF',
    },
});
