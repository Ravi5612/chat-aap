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

    return (
        <View className="flex-row items-center gap-3 py-1 pr-4 min-w-[180px]">
            <TouchableOpacity
                onPress={playPause}
                className={`w-10 h-10 rounded-full items-center justify-center ${isCurrentUser ? 'bg-white/20' : 'bg-[#F68537]/10'}`}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color={isCurrentUser ? "white" : "#F68537"} />
                ) : (
                    <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={20}
                        color={isCurrentUser ? "white" : "#F68537"}
                    />
                )}
            </TouchableOpacity>

            <View className="flex-1">
                <View className={`h-1.5 w-full rounded-full overflow-hidden ${isCurrentUser ? 'bg-white/30' : 'bg-gray-100'}`}>
                    <View
                        className={`h-full ${isCurrentUser ? 'bg-white' : 'bg-[#F68537]'}`}
                        style={{ width: `${progress}%` }}
                    />
                </View>
                <View className="flex-row justify-between mt-1">
                    <Text className={`text-[9px] ${isCurrentUser ? 'text-white/70' : 'text-gray-400'}`}>
                        {formatTime(position)}
                    </Text>
                    <Text className={`text-[9px] ${isCurrentUser ? 'text-white/70' : 'text-gray-400'}`}>
                        {formatTime(duration || 0)}
                    </Text>
                </View>
            </View>
        </View>
    );
}
