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
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChatLoader from '@/components/ui/ChatLoader';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleResetPassword = async () => {
        if (!password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            Alert.alert('Success', 'Password has been reset successfully! 👋');
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
                                source={require('@/assets/images/logo.png')}
                                style={{ width: 120, height: 120, marginBottom: 8 }}
                                resizeMode="contain"
                            />
                            <Text className="text-2xl font-bold text-[#F68537]">Reset Password</Text>
                            <Text className="text-gray-600 mt-2">Enter your new password</Text>
                        </View>

                        <View className="space-y-4">
                            <View>
                                <Text className="text-gray-700 font-medium mb-2">New Password</Text>
                                <View className="relative justify-center">
                                    <TextInput
                                        value={password}
                                        onChangeText={setPassword}
                                        placeholder="Min 6 characters"
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
                            </View>

                            <View>
                                <Text className="text-gray-700 font-medium mb-2">Confirm New Password</Text>
                                <View className="relative justify-center">
                                    <TextInput
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        placeholder="Confirm new password"
                                        secureTextEntry={!showConfirmPassword}
                                        className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:border-[#F68537]"
                                        editable={!loading}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4"
                                    >
                                        <IconSymbol
                                            name={showConfirmPassword ? "eye.slash.fill" : "eye.fill"}
                                            size={24}
                                            color="#687076"
                                        />
                                    </TouchableOpacity>
                                </View>
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
                                    <Text className="text-white text-lg font-bold">Update Password</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
            {loading && <ChatLoader />}
        </SafeAreaView>
    );
}
