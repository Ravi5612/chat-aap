import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
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
        console.log('AddStatus: Attempting to post status...', content.substring(0, 10));

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not logged in');

            const statusData = {
                user_id: user.id,
                content: content.trim(),
                media_type: 'text',
                background_color: bgColor,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                is_deleted: false
            };

            console.log('AddStatus: Inserting into DB:', statusData);
            const { error, data } = await supabase.from('statuses').insert([statusData]).select();

            if (error) {
                console.error('AddStatus: DB Error:', error);
                throw error;
            }

            console.log('AddStatus: Post successful!', data);
            router.back();
        } catch (error: any) {
            console.error('AddStatus: Catch Error:', error);
            alert('Failed to post: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
                    <Ionicons name="close" size={32} color="white" />
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <TouchableOpacity
                    onPress={handlePost}
                    disabled={loading || !content.trim()}
                    style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        paddingHorizontal: 24,
                        paddingVertical: 10,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.3)'
                    }}
                >
                    {loading ? (
                        <ActivityIndicator color="white" size="small" />
                    ) : (
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>Post Status</Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 40 }}>
                    <TextInput
                        multiline
                        placeholder="Type your status..."
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        style={{ color: 'white', fontSize: 28, fontWeight: 'bold', textAlign: 'center' }}
                        value={content}
                        onChangeText={setContent}
                        autoFocus
                    />
                </ScrollView>

                <View style={{ padding: 24, backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginBottom: 16, letterSpacing: 1 }}>Choose Background</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {BG_COLORS.map((color) => (
                            <TouchableOpacity
                                key={color}
                                onPress={() => setBgColor(color)}
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 22,
                                    marginRight: 16,
                                    backgroundColor: color,
                                    borderWidth: 3,
                                    borderColor: bgColor === color ? 'white' : 'transparent'
                                }}
                            />
                        ))}
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
