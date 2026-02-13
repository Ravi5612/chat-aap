import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

const BG_COLORS = ['#F68537', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#1E293B'];

export default function AddStatus() {
    const router = useRouter();
    const [content, setContent] = useState('');
    const [bgColor, setBgColor] = useState(BG_COLORS[0]);
    const [loading, setLoading] = useState(false);

    const handlePost = async () => {
        if (!content.trim()) return;
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not logged in');

            const { error } = await supabase.from('statuses').insert([{
                user_id: user.id,
                content: content.trim(),
                media_type: 'text',
                background_color: bgColor,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }]);

            if (error) throw error;
            router.back();
        } catch (error) {
            console.error('Error posting status:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: bgColor }}>
            <View className="flex-row items-center justify-between px-4 py-2">
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="close" size={32} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={handlePost}
                    disabled={loading || !content.trim()}
                    className={`bg-white/20 px-6 py-2 rounded-full border border-white/30`}
                >
                    <Text className="text-white font-bold">{loading ? 'Posting...' : 'Post'}</Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-1"
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 40 }}>
                    <TextInput
                        multiline
                        placeholder="Type your status..."
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        className="text-white text-3xl font-bold text-center"
                        value={content}
                        onChangeText={setContent}
                        autoFocus
                    />
                </ScrollView>

                <View className="p-6 bg-black/10">
                    <Text className="text-white/70 text-xs font-bold uppercase mb-4">Choose Background</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {BG_COLORS.map((color) => (
                            <TouchableOpacity
                                key={color}
                                onPress={() => setBgColor(color)}
                                className={`w-10 h-10 rounded-full mr-4 border-2 ${bgColor === color ? 'border-white' : 'border-transparent'}`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
