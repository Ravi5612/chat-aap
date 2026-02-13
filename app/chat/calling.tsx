import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, SafeAreaView, StyleSheet, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function CallingScreen() {
    const { friendId, name, img, type, status: initialStatus } = useLocalSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState(initialStatus || 'outgoing'); // outgoing, incoming, active
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        let interval: any;
        if (status === 'active') {
            interval = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [status]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleEndCall = () => {
        router.back();
    };

    const handleAcceptCall = () => {
        setStatus('active');
    };

    return (
        <View className="flex-1 bg-gray-900">
            <SafeAreaView className="flex-1 items-center justify-between py-20">
                <View className="items-center">
                    <Text className="text-white/70 text-lg mb-2">
                        {status === 'outgoing' ? 'Calling...' :
                            status === 'incoming' ? 'Incoming Call' :
                                formatTime(timer)}
                    </Text>
                    <Text className="text-white text-3xl font-bold">{name || 'User'}</Text>
                </View>

                <View className="items-center">
                    <View className="relative">
                        <Image
                            source={{ uri: (img as string) || 'https://via.placeholder.com/300' }}
                            className="w-48 h-48 rounded-full border-4 border-[#F68537]"
                        />
                        {status === 'outgoing' && (
                            <View style={styles.pulse} className="absolute -inset-4 border-2 border-[#F68537] rounded-full opacity-50" />
                        )}
                    </View>
                </View>

                <View className="flex-row items-center gap-10">
                    {status === 'incoming' ? (
                        <>
                            <TouchableOpacity
                                onPress={handleEndCall}
                                className="bg-red-500 w-16 h-16 rounded-full items-center justify-center"
                            >
                                <Ionicons name="close" size={32} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleAcceptCall}
                                className="bg-green-500 w-16 h-16 rounded-full items-center justify-center"
                            >
                                <Ionicons name="call" size={32} color="white" />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity className="bg-white/10 w-12 h-12 rounded-full items-center justify-center">
                                <Ionicons name="mic-off" size={24} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleEndCall}
                                className="bg-red-500 w-20 h-20 rounded-full items-center justify-center shadow-lg"
                            >
                                <Ionicons name="call" size={40} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
                            </TouchableOpacity>
                            <TouchableOpacity className="bg-white/10 w-12 h-12 rounded-full items-center justify-center">
                                <Ionicons name="videocam-off" size={24} color="white" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    pulse: {
        // You'd use Reanimated for a proper pulse, this is a placeholder
    }
});
