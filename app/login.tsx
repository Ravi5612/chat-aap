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

    useEffect(() => {
        console.log('LoginPage mounted');
    }, []);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF5E6' }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -100}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    bounces={false}
                >
                    <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 40 }}>
                        <View style={{ backgroundColor: 'white', padding: 32, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8, width: '100%' }}>
                            <View style={{ alignItems: 'center', marginBottom: 32 }}>
                                <Image
                                    source={require('@/assets/images/icon.png')}
                                    style={{ width: 128, height: 128, marginBottom: 16 }}
                                    resizeMode="contain"
                                />
                                <Text style={{ fontSize: 30, fontWeight: 'bold', color: '#F68537' }}>Chat Warrior</Text>
                                <Text style={{ color: '#6B7280', marginTop: 8 }}>Login to your account</Text>
                            </View>

                            <View style={{ gap: 16 }}>
                                <View>
                                    <Text style={{ color: '#374151', fontWeight: '500', marginBottom: 8 }}>Email</Text>
                                    <TextInput
                                        value={email}
                                        onChangeText={setEmail}
                                        placeholder="Enter your email"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, fontSize: 16 }}
                                        editable={!loading}
                                    />
                                </View>

                                <View>
                                    <Text style={{ color: '#374151', fontWeight: '500', marginBottom: 8 }}>Password</Text>
                                    <View style={{ position: 'relative', justifyContent: 'center' }}>
                                        <TextInput
                                            value={password}
                                            onChangeText={setPassword}
                                            placeholder="Enter your password"
                                            secureTextEntry={!showPassword}
                                            style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, fontSize: 16 }}
                                            editable={!loading}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowPassword(!showPassword)}
                                            style={{ position: 'absolute', right: 16 }}
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
                                        style={{ marginTop: 8, alignItems: 'flex-end' }}
                                    >
                                        <Text style={{ color: '#F68537', fontWeight: '500' }}>Forgot Password?</Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    onPress={handleLogin}
                                    disabled={loading}
                                    style={{ width: '100%', backgroundColor: '#F68537', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 }}
                                    activeOpacity={0.8}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Login</Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 32 }}>
                                <Text style={{ color: '#6B7280' }}>Don't have an account? </Text>
                                <TouchableOpacity onPress={() => router.push('/signup')}>
                                    <Text style={{ color: '#F68537', fontWeight: 'bold' }}>Sign Up</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
