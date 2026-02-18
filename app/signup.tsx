import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase, resendVerification } from '@/lib/supabase';
import AuthScreen from '@/components/ui/AuthScreen';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

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
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }
        if (password !== confirmPassword) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        if (password.length < 6) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            const normalizedEmail = email.trim().toLowerCase();
            const { data: userStatus, error: rpcError } = await supabase.rpc('process_repeated_signup', {
                email_input: normalizedEmail,
                name_input: name,
                phone_input: phone
            });
            if (rpcError) console.error('RPC Error:', rpcError);

            if (userStatus === 'already_verified') {
                setLoading(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                Alert.alert(
                    'Account Exists',
                    'Aap pehle se registered aur verified hain. 👋\n\nAgar password bhul gaye hain to "Forgot Password" ka use karein.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Forgot Password', onPress: () => router.push('/forgot-password') }
                    ]
                );
                return;
            }
            if (userStatus === 'unverified_updated') {
                await resendVerification(normalizedEmail);
                setLoading(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Updated!', 'Verification link firse bhej diya gaya hai! 📧', [
                    { text: 'OK', onPress: () => router.replace('/login') }
                ]);
                return;
            }
            const { error } = await supabase.auth.signUp({
                email: normalizedEmail,
                password: password,
                options: {
                    emailRedirectTo: `https://chat-warrios.vercel.app/login`,
                    data: { name, phone }
                }
            });
            if (error) throw error;

            setLoading(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success!', 'Signup successful! Please check your email for verification link. 📧', [
                { text: 'OK', onPress: () => router.replace('/login') }
            ]);
        } catch (error: any) {
            setLoading(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Signup Failed', error.message);
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
            <AuthScreen title="Create your account" subtitle="Join Chat Warrior today!" loading={loading}>
                <View style={{ gap: 16 }}>
                    {/* Name */}
                    <View>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter your name"
                            style={inputStyle}
                            editable={!loading}
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

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

                    {/* Phone */}
                    <View>
                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="Enter your phone number"
                            keyboardType="phone-pad"
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
                                placeholder="Min 6 characters"
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
                                <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Confirm Password */}
                    <View>
                        <Text style={styles.label}>Confirm Password</Text>
                        <View style={{ position: 'relative', justifyContent: 'center' }}>
                            <TextInput
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="Confirm your password"
                                secureTextEntry={!showConfirmPassword}
                                style={inputStyle}
                                editable={!loading}
                                placeholderTextColor="#9CA3AF"
                            />
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setShowConfirmPassword(!showConfirmPassword);
                                }}
                                style={styles.eyeIcon}
                            >
                                <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={22} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Sign Up Button */}
                    <TouchableOpacity
                        onPress={handleSignup}
                        disabled={loading}
                        style={styles.signupButton}
                        activeOpacity={0.8}
                    >
                        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.signupButtonText}>Sign Up</Text>}
                    </TouchableOpacity>

                    {/* Login Link */}
                    <View style={styles.loginContainer}>
                        <Text style={{ color: '#6B7280', fontSize: 15 }}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.replace('/login')}>
                            <Text style={{ color: '#F68537', fontWeight: 'bold', fontSize: 15 }}>Login</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Forgot Password */}
                    <TouchableOpacity
                        onPress={() => router.push('/forgot-password')}
                        style={{ alignItems: 'center', marginTop: 4 }}
                    >
                        <Text style={{ color: '#F68537', fontWeight: '500' }}>Forgot Password?</Text>
                    </TouchableOpacity>
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
    signupButton: {
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
    signupButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 8,
    }
});
