import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setLoading(true);

        try {
            const normalizedEmail = email.trim().toLowerCase();

            const { data: { session }, error } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password: password,
            });

            if (error) throw error;

            // 🔐 Store session ID in profile to enforce single device login
            if (session) {
                await supabase
                    .from('profiles')
                    .update({ current_session_id: session.user.id }) // Using user.id as basic implementation
                    .eq('id', session.user.id);
            }

            Alert.alert('Welcome back!', 'Login successful 👋');
            router.replace('/(tabs)');

        } catch (error: any) {
            Alert.alert('Login Failed', error.message);
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#FFF5E6]">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -100}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    className="px-6"
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    bounces={false}
                >
                    <View className="flex-1 justify-center py-10">
                        <View className="bg-white p-8 rounded-3xl shadow-xl w-full">
                            <View className="items-center mb-8">
                                <Image
                                    source={require('@/assets/images/icon.png')}
                                    className="w-32 h-32 mb-4"
                                    resizeMode="contain"
                                />
                                <Text className="text-3xl font-bold text-[#F68537]">Chat Warrior</Text>
                                <Text className="text-gray-600 mt-2">Login to your account</Text>
                            </View>

                            <View className="space-y-4">
                                <View>
                                    <Text className="text-gray-700 font-medium mb-2">Email</Text>
                                    <TextInput
                                        value={email}
                                        onChangeText={setEmail}
                                        placeholder="Enter your email"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:border-[#F68537]"
                                        editable={!loading}
                                    />
                                </View>

                                <View>
                                    <Text className="text-gray-700 font-medium mb-2">Password</Text>
                                    <View className="relative justify-center">
                                        <TextInput
                                            value={password}
                                            onChangeText={setPassword}
                                            placeholder="Enter your password"
                                            secureTextEntry={!showPassword}
                                            className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:border-[#F68537]"
                                            editable={!loading}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowPassword(!showPassword)}
                                            className="absolute right-4"
                                        >
                                            <IconSymbol
                                                name={showPassword ? "eye.slash.fill" : "eye.fill"}
                                                size={24}
                                                color="#687076"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => router.push('/forgot-password')}
                                        className="mt-2 items-end"
                                    >
                                        <Text className="text-[#F68537] font-medium">Forgot Password?</Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    onPress={handleLogin}
                                    disabled={loading}
                                    className="w-full bg-[#F68537] py-4 rounded-xl items-center mt-6 shadow-md"
                                    activeOpacity={0.8}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text className="text-white text-lg font-bold">Login</Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row justify-center mt-8">
                                <Text className="text-gray-600">Don't have an account? </Text>
                                <TouchableOpacity onPress={() => router.push('/signup')}>
                                    <Text className="text-[#F68537] font-bold">Sign Up</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
