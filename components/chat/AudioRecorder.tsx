import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

interface AudioRecorderProps {
    onRecordingComplete: (uri: string) => void;
    onCancel: () => void;
}

export default function AudioRecorder({ onRecordingComplete, onCancel }: AudioRecorderProps) {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [seconds, setSeconds] = useState(0);
    const timerRef = useRef<any>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        startRecording();
        startPulse();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            stopRecordingCleanup();
        };
    }, []);

    const startPulse = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            ])
        ).start();
    };

    const startRecording = async () => {
        try {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);

            timerRef.current = setInterval(() => {
                setSeconds(s => s + 1);
            }, 1000);
        } catch (err) {
            console.error('Failed to start recording', err);
            onCancel();
        }
    };

    const stopRecordingCleanup = async () => {
        if (recording) {
            try {
                await recording.stopAndUnloadAsync();
            } catch (e) { }
        }
    };

    const handleStop = async () => {
        if (!recording) return;

        clearInterval(timerRef.current);
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        if (uri) {
            onRecordingComplete(uri);
        }
    };

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View className="absolute inset-0 bg-white flex-row items-center px-4 z-50">
            <Animated.View
                style={{ transform: [{ scale: pulseAnim }] }}
                className="w-3 h-3 bg-red-500 rounded-full mr-3"
            />
            <Text className="text-gray-600 font-mono text-lg flex-1">{formatTime(seconds)}</Text>

            <View className="flex-row items-center gap-4">
                <TouchableOpacity onPress={onCancel} className="p-2">
                    <Ionicons name="trash-outline" size={24} color="#EF4444" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={handleStop}
                    className="bg-[#F68537] w-12 h-12 rounded-full items-center justify-center shadow-lg"
                >
                    <Ionicons name="send" size={20} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );
}
