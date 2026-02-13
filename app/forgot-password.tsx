import React, { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async () => {
        if (!email) {
            Alert.alert('Error', 'Please enter your email');
            return;
        }

        setLoading(true);

        try {
            const normalizedEmail = email.trim().toLowerCase();

            const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
                redirectTo: `chatwarriors://reset-password`,
            });

            if (error) throw error;

            Alert.alert('Success', 'Check your email for the password reset link! 📧');
            router.replace('/login');

        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#FFF5E6]">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                className="flex-1"
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                    className="px-6"
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="bg-white p-8 rounded-3xl shadow-xl w-full">
                        <View className="items-center mb-8">
                            <Image
                                source={require('@/assets/images/icon.png')}
                                className="w-32 h-32 mb-4"
                                resizeMode="contain"
                            />
                            <Text className="text-2xl font-bold text-[#F68537]">Forgot Password</Text>
                            <Text className="text-gray-600 mt-2 text-center">
                                Enter your email to receive a reset link
                            </Text>
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

                            <TouchableOpacity
                                onPress={handleResetPassword}
                                disabled={loading}
                                className="w-full bg-[#F68537] py-4 rounded-xl items-center mt-6 shadow-md"
                                activeOpacity={0.8}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white text-lg font-bold">Send Reset Link</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={() => router.replace('/login')}
                            className="mt-8 items-center"
                        >
                            <Text className="text-gray-500 font-medium">Back to Login</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
