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
import { supabase, resendVerification } from '@/lib/supabase';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignupPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSignup = async () => {
        if (!name || !email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const normalizedEmail = email.trim().toLowerCase();

            // 1. Process repeated signup check via RPC (Web logic)
            const { data: userStatus, error: rpcError } = await supabase.rpc('process_repeated_signup', {
                email_input: normalizedEmail,
                name_input: name,
                phone_input: phone
            });

            if (rpcError) {
                console.error('RPC Error:', rpcError);
            }

            if (userStatus === 'already_verified') {
                Alert.alert('Info', 'Aap pehle se registered aur verified hain. 👋\n\nAgar password bhul gaye hain to "Forgot Password" ka use karein.');
                setLoading(false);
                return;
            }

            if (userStatus === 'unverified_updated') {
                await resendVerification(normalizedEmail);
                Alert.alert('Success', 'Aapki details update kar di gayi hain aur verification link firse bhej diya gaya hai! 📧');
                router.replace('/login');
                return;
            }

            // 2. Normal signup
            const { error } = await supabase.auth.signUp({
                email: normalizedEmail,
                password: password,
                options: {
                    emailRedirectTo: `chatwarriors://login`,
                    data: {
                        name: name,
                        phone: phone
                    }
                }
            });

            if (error) throw error;

            Alert.alert('Success', 'Signup successful! Please check your email for verification link. 📧');
            router.replace('/login');

        } catch (error: any) {
            Alert.alert('Signup Failed', error.message);
        } finally {
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
                    <View className="py-10">
                        <View className="bg-white p-8 rounded-3xl shadow-xl w-full">
                            <View className="items-center mb-8">
                                <Image
                                    source={require('@/assets/images/icon.png')}
                                    className="w-24 h-24 mb-4"
                                    resizeMode="contain"
                                />
                                <Text className="text-3xl font-bold text-[#F68537]">Chat Warrior</Text>
                                <Text className="text-gray-600 mt-2">Create your account</Text>
                            </View>

                            <View className="space-y-4">
                                <View>
                                    <Text className="text-gray-700 font-medium mb-2">Name</Text>
                                    <TextInput
                                        value={name}
                                        onChangeText={setName}
                                        placeholder="Enter your name"
                                        className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:border-[#F68537]"
                                        editable={!loading}
                                    />
                                </View>

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
                                    <Text className="text-gray-700 font-medium mb-2">Phone Number</Text>
                                    <TextInput
                                        value={phone}
                                        onChangeText={setPhone}
                                        placeholder="Enter your phone number"
                                        keyboardType="phone-pad"
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
                                    <Text className="text-gray-700 font-medium mb-2">Confirm Password</Text>
                                    <View className="relative justify-center">
                                        <TextInput
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            placeholder="Confirm your password"
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
                                    onPress={handleSignup}
                                    disabled={loading}
                                    className="w-full bg-[#F68537] py-4 rounded-xl items-center mt-6 shadow-md"
                                    activeOpacity={0.8}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text className="text-white text-lg font-bold">Sign Up</Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row justify-center mt-8">
                                <Text className="text-gray-600">Already have an account? </Text>
                                <TouchableOpacity onPress={() => router.replace('/login')}>
                                    <Text className="text-[#F68537] font-bold">Login</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
