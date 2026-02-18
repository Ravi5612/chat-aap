import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import AuthScreen from '@/components/ui/AuthScreen';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
            if (session) {
                await supabase
                    .from('profiles')
                    .update({ current_session_id: session.user.id })
                    .eq('id', session.user.id);
            }

            setLoading(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/(tabs)');
        } catch (error: any) {
            setLoading(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Login Failed', error.message);
        }
    };

    const inputStyle = {
        width: '100%' as const,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        fontSize: 16,
        backgroundColor: 'white',
    };

    return (
        <View style={{ flex: 1 }}>
            <AuthScreen title="Login to your account" subtitle="Welcome back!" loading={loading}>
                <View style={{ gap: 20 }}>
                    {/* Email */}
                    <View>
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Enter your email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            style={inputStyle}
                            editable={!loading}
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

                    {/* Password */}
                    <View>
                        <Text style={styles.label}>Password</Text>
                        <View style={{ position: 'relative', justifyContent: 'center' }}>
                            <TextInput
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Enter your password"
                                secureTextEntry={!showPassword}
                                style={inputStyle}
                                editable={!loading}
                                placeholderTextColor="#9CA3AF"
                            />
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setShowPassword(!showPassword);
                                }}
                                style={styles.eyeIcon}
                            >
                                <Ionicons
                                    name={showPassword ? "eye-off" : "eye"}
                                    size={22}
                                    color="#6B7280"
                                />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push('/forgot-password');
                            }}
                            style={{ marginTop: 8, alignItems: 'flex-end' }}
                        >
                            <Text style={{ color: '#F68537', fontWeight: '600', fontSize: 14 }}>Forgot Password?</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Login Button */}
                    <TouchableOpacity
                        onPress={handleLogin}
                        disabled={loading}
                        style={styles.loginButton}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.loginButtonText}>Login</Text>
                        )}
                    </TouchableOpacity>

                    {/* Signup Link */}
                    <View style={styles.signupContainer}>
                        <Text style={{ color: '#6B7280', fontSize: 15 }}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/signup')}>
                            <Text style={{ color: '#F68537', fontWeight: 'bold', fontSize: 15 }}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </AuthScreen>
        </View>
    );
}

const styles = StyleSheet.create({
    label: {
        color: '#374151',
        fontWeight: '600',
        marginBottom: 8,
        fontSize: 14,
        paddingLeft: 4,
    },
    eyeIcon: {
        position: 'absolute',
        right: 16,
        height: '100%',
        justifyContent: 'center',
    },
    loginButton: {
        width: '100%',
        backgroundColor: '#F68537',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 12,
        shadowColor: '#F68537',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    loginButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 12,
    }
});
