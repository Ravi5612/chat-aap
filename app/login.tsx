import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import AuthScreen from '@/components/ui/AuthScreen';
import * as Haptics from 'expo-haptics';
import { logErrorToDB } from '@/utils/errorLogger';

export default function LoginPage() {
    const router = useRouter();
    
    // UI State
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form Fields
    const [identifier, setIdentifier] = useState(''); // Used for Login (Email OR Phone)
    const [email, setEmail] = useState('');           // Used for SignUp
    const [phone, setPhone] = useState('');           // Used for SignUp
    const [password, setPassword] = useState('');

    const handleAuth = async () => {
        if (loading) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (isSignUp) {
            // --- SIGN UP LOGIC ---
            if (!email.trim() || !email.includes('@')) {
                Alert.alert('Error', 'Please enter a valid email address');
                return;
            }
            if (!phone.trim()) {
                Alert.alert('Error', 'Please enter your phone number');
                return;
            }
            if (password.length < 6) {
                Alert.alert('Error', 'Password must be at least 6 characters');
                return;
            }

            setLoading(true);
            try {
                const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

                // 1. Create account
                const { data, error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password: password,
                    // Store phone in metadata just in case
                    options: { data: { phone: formattedPhone } }
                });

                if (error) throw error;

                if (data.session) {
                    // 2. Account created and logged in! Now update the profile with the phone number
                    await supabase.from('profiles').update({ 
                        phone: formattedPhone,
                        current_session_id: data.session.user.id 
                    }).eq('id', data.session.user.id);

                    // Check username
                    const { data: profile } = await supabase.from('profiles').select('username').eq('id', data.session.user.id).single();
                    
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    if (!profile?.username) {
                        router.replace('/setup-profile');
                    } else {
                        router.replace('/(tabs)');
                    }
                } else {
                    // If confirm email is ON, session will be null
                    Alert.alert('Verify Email', 'Please check your email to verify your account.');
                }
            } catch (error: any) {
                logErrorToDB(error, 'Auth: Sign Up', null, email);
                Alert.alert('Sign Up Failed', error.message);
            } finally {
                setLoading(false);
            }
        } else {
            // --- LOGIN LOGIC ---
            if (!identifier.trim()) {
                Alert.alert('Error', 'Please enter your email or phone number');
                return;
            }
            if (!password) {
                Alert.alert('Error', 'Please enter your password');
                return;
            }

            setLoading(true);
            try {
                let loginEmail = identifier.trim().toLowerCase();

                // If user entered a phone number (doesn't contain '@'), find their email first
                if (!loginEmail.includes('@')) {
                    const searchPhone = loginEmail.startsWith('+') ? loginEmail : `+91${loginEmail}`;
                    
                    // Supabase trick: find email from profiles table
                    const { data: profileMatch, error: searchError } = await supabase
                        .from('profiles')
                        .select('email')
                        .eq('phone', searchPhone)
                        .maybeSingle();

                    if (searchError) throw searchError;
                    
                    if (profileMatch?.email) {
                        loginEmail = profileMatch.email;
                    } else {
                        throw new Error("No account found with this phone number. Try your email or Sign Up.");
                    }
                }

                // Sign in with the actual email
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: loginEmail,
                    password: password,
                });

                if (error) throw error;

                if (data.session) {
                    await supabase.from('profiles').update({ 
                        current_session_id: data.session.user.id 
                    }).eq('id', data.session.user.id);

                    const { data: profile } = await supabase.from('profiles').select('username').eq('id', data.session.user.id).single();
                    
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    if (!profile?.username) {
                        router.replace('/setup-profile');
                    } else {
                        router.replace('/(tabs)');
                    }
                }
            } catch (error: any) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                logErrorToDB(error, 'Auth: Login', null, identifier);
                Alert.alert('Login Failed', error.message);
            } finally {
                setLoading(false);
            }
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
        marginBottom: 16,
    };

    return (
        <View style={{ flex: 1 }}>
            <AuthScreen 
                title={isSignUp ? "Create Account" : "Welcome Back"} 
                subtitle={isSignUp ? "Join Chat Warriors today!" : "Login to your account"} 
                loading={loading}
            >
                <View>
                    {isSignUp ? (
                        <>
                            <Text style={styles.label}>Email Address</Text>
                            <TextInput
                                value={email}
                                onChangeText={setEmail}
                                placeholder="you@example.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                style={inputStyle}
                                editable={!loading}
                            />

                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="For your friends to find you"
                                keyboardType="phone-pad"
                                style={inputStyle}
                                editable={!loading}
                            />
                        </>
                    ) : (
                        <>
                            <Text style={styles.label}>Email or Phone Number</Text>
                            <TextInput
                                value={identifier}
                                onChangeText={setIdentifier}
                                placeholder="Enter email or phone"
                                autoCapitalize="none"
                                style={inputStyle}
                                editable={!loading}
                            />
                        </>
                    )}

                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Secret password"
                        secureTextEntry
                        style={inputStyle}
                        editable={!loading}
                    />

                    <TouchableOpacity
                        onPress={handleAuth}
                        disabled={loading}
                        style={styles.actionButton}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.actionButtonText}>
                                {isSignUp ? "Sign Up" : "Login"}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setIsSignUp(!isSignUp);
                            setPassword('');
                        }}
                        style={{ alignItems: 'center', marginTop: 24, padding: 10 }}
                    >
                        <Text style={{ color: '#6B7280', fontSize: 15 }}>
                            {isSignUp ? "Already have an account? " : "Don't have an account? "}
                            <Text style={{ color: '#F68537', fontWeight: 'bold' }}>
                                {isSignUp ? "Login here" : "Sign Up"}
                            </Text>
                        </Text>
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
    actionButton: {
        width: '100%',
        backgroundColor: '#FF69B4',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#F68537',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    actionButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    }
});
