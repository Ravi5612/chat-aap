import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

interface VoiceMessagePlayerProps {
    uri: string;
    isCurrentUser: boolean;
}

export default function VoiceMessagePlayer({ uri, isCurrentUser }: VoiceMessagePlayerProps) {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        return sound
            ? () => {
                sound.unloadAsync();
            }
            : undefined;
    }, [sound]);

    // Preload total duration silently on mount
    useEffect(() => {
        let active = true;
        let preloadedSound: Audio.Sound | null = null;

        const preloadDuration = async () => {
            if (!uri) return;
            try {
                const { sound: soundObj, status } = await Audio.Sound.createAsync(
                    { uri },
                    { shouldPlay: false }
                );
                preloadedSound = soundObj;
                if (status.isLoaded && active) {
                    setDuration(status.durationMillis || 0);
                }
            } catch (error) {
                console.warn('[VOICE_PLAYER] Preload duration failed:', error);
            } finally {
                if (preloadedSound) {
                    try {
                        await preloadedSound.unloadAsync();
                    } catch (e) {}
                }
            }
        };

        preloadDuration();

        return () => {
            active = false;
        };
    }, [uri]);

    const playPause = async () => {
        if (isLoading) return;

        if (sound === null) {
            setIsLoading(true);
            try {
                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri },
                    { shouldPlay: true },
                    onPlaybackStatusUpdate
                );
                setSound(newSound);
                setIsPlaying(true);
            } catch (error) {
                console.error('Error loading sound', error);
            } finally {
                setIsLoading(false);
            }
        } else {
            if (isPlaying) {
                await sound.pauseAsync();
                setIsPlaying(false);
            } else {
                if (position >= duration) {
                    await sound.setPositionAsync(0);
                }
                await sound.playAsync();
                setIsPlaying(true);
            }
        }
    };

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setDuration(status.durationMillis || 0);
            setPosition(status.positionMillis || 0);
            if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(status.durationMillis || 0);
            }
        }
    };

    const formatTime = (millis: number) => {
        const totalSeconds = millis / 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const progress = duration > 0 ? (position / duration) * 100 : 0;

    // Symmetrical, premium voice note soundwave levels
    const waveHeights = [6, 12, 18, 24, 16, 10, 14, 20, 28, 22, 14, 18, 26, 20, 14, 10, 16, 22, 18, 12, 8, 4];

    return (
        <View className="flex-row items-center gap-3.5 py-1.5 pr-2 min-w-[200px]">
            {/* Elegant Glassmorphic Play/Pause Trigger */}
            <TouchableOpacity
                onPress={playPause}
                className={`w-11 h-11 rounded-full items-center justify-center border ${
                    isCurrentUser 
                        ? 'bg-white/20 border-white/20 shadow-sm' 
                        : 'bg-[#F68537]/10 border-[#F68537]/20 shadow-sm'
                }`}
                style={{ elevation: 2 }}
                activeOpacity={0.8}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color={isCurrentUser ? "white" : "#F68537"} />
                ) : (
                    <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={22}
                        color={isCurrentUser ? "white" : "#F68537"}
                        style={{ marginLeft: isPlaying ? 0 : 2 }}
                    />
                )}
            </TouchableOpacity>

            <View className="flex-1 justify-center">
                {/* Modern Symmetrical Interactive Audio Soundwave */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2.5, height: 32, paddingLeft: 2 }}>
                    {waveHeights.map((h, i) => {
                        const barProgress = (i / waveHeights.length) * 100;
                        const isActive = progress >= barProgress;
                        return (
                            <View
                                key={i}
                                style={{
                                    width: 3.2,
                                    height: h,
                                    borderRadius: 1.6,
                                    backgroundColor: isActive
                                        ? (isCurrentUser ? '#FFFFFF' : '#F68537')
                                        : (isCurrentUser ? 'rgba(255,255,255,0.35)' : 'rgba(246,133,55,0.18)')
                                }}
                            />
                        );
                    })}
                </View>

                {/* Subtitle details: Time Badges & Mic Indicator */}
                <View className="flex-row justify-between items-center mt-1 px-0.5">
                    <View className="flex-row items-center gap-1">
                        <Ionicons 
                            name="mic-outline" 
                            size={10.5} 
                            color={isCurrentUser ? "rgba(255,255,255,0.7)" : "#F68537"} 
                        />
                        <Text className={`text-[10px] font-medium ${isCurrentUser ? 'text-white/80' : 'text-[#F68537]'}`}>
                            {formatTime(position)}
                        </Text>
                    </View>
                    <Text className={`text-[10px] font-medium ${isCurrentUser ? 'text-white/60' : 'text-gray-400'}`}>
                        {formatTime(duration || 0)}
                    </Text>
                </View>
            </View>
        </View>
    );
}
