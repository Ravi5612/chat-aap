import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, SafeAreaView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

const { width, height } = Dimensions.get('window');

export default function StatusViewer() {
    const { userId, initialIndex } = useLocalSearchParams();
    const router = useRouter();
    const [statuses, setStatuses] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(parseInt(initialIndex as string || '0'));
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState('');

    useEffect(() => {
        const fetchStatuses = async () => {
            if (!userId) return;
            const { data, error } = await supabase
                .from('statuses')
                .select('*, profiles!user_id(username, avatar_url)')
                .eq('user_id', userId)
                .gt('expires_at', new Date().toISOString())
                .eq('is_deleted', false)
                .order('created_at', { ascending: true });

            if (!error && data) {
                setStatuses(data);
            }
            setLoading(false);
        };
        fetchStatuses();
    }, [userId]);

    const handleNext = () => {
        if (currentIndex < statuses.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            router.back();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    if (loading || statuses.length === 0) return null;

    const currentStatus = statuses[currentIndex];

    return (
        <View className="flex-1 bg-black">
            {/* Media Content */}
            <TouchableOpacity
                activeOpacity={1}
                onPress={(e) => {
                    const x = e.nativeEvent.locationX;
                    if (x < width / 3) handlePrev();
                    else if (x > (2 * width) / 3) handleNext();
                }}
                className="flex-1"
            >
                {currentStatus.media_type === 'image' ? (
                    <Image
                        source={{ uri: currentStatus.media_url }}
                        className="w-full h-full"
                        style={{ resizeMode: 'contain' }}
                    />
                ) : currentStatus.media_type === 'text' ? (
                    <View
                        className="flex-1 items-center justify-center p-10"
                        style={{ backgroundColor: currentStatus.background_color || '#F68537' }}
                    >
                        <Text className="text-white text-3xl font-bold text-center">
                            {currentStatus.content}
                        </Text>
                    </View>
                ) : null}
            </TouchableOpacity>

            {/* Header / Progress Bars */}
            <SafeAreaView className="absolute top-0 left-0 right-0 p-4">
                <View className="flex-row gap-1 mb-4">
                    {statuses.map((_, index) => (
                        <View
                            key={index}
                            className={`h-1 flex-1 rounded-full ${index <= currentIndex ? 'bg-white' : 'bg-white/30'}`}
                        />
                    ))}
                </View>

                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                        <Image
                            source={{ uri: currentStatus.profiles?.avatar_url || 'https://via.placeholder.com/150' }}
                            className="w-10 h-10 rounded-full border border-white"
                        />
                        <View className="ml-3">
                            <Text className="text-white font-bold">{currentStatus.profiles?.username || 'Unknown'}</Text>
                            <Text className="text-white/70 text-xs">Today</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="close" size={32} color="white" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Footer / Reply */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="absolute bottom-0 left-0 right-0 p-4 pb-10"
            >
                <View className="flex-row items-center bg-white/10 rounded-full px-4 py-2 border border-white/20">
                    <TextInput
                        placeholder="Reply to status..."
                        placeholderTextColor="#CBD5E1"
                        className="flex-1 text-white py-2"
                        value={replyText}
                        onChangeText={setReplyText}
                    />
                    <TouchableOpacity className="ml-2">
                        <Ionicons name="send" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}
