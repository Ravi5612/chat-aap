import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import AuthScreen from '@/components/ui/AuthScreen';

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
                redirectTo: `https://chat-warrios.vercel.app/reset-password`,
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

    const inputStyle = {
        width: '100%' as const,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        fontSize: 16,
        backgroundColor: 'white',
    };

    return (
        <AuthScreen title="Reset your password" subtitle="We'll send you a reset link" loading={loading}>
            {/* Email */}
            <View>
                <Text style={{ color: '#374151', fontWeight: '500', marginBottom: 8 }}>Email</Text>
                <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={inputStyle}
                    editable={!loading}
                />
            </View>

            {/* Send Reset Link Button */}
            <TouchableOpacity
                onPress={handleResetPassword}
                disabled={loading}
                style={{ width: '100%', backgroundColor: '#F68537', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8, elevation: 4 }}
                activeOpacity={0.8}
            >
                {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Send Reset Link</Text>}
            </TouchableOpacity>

            {/* Back to Login */}
            <TouchableOpacity onPress={() => router.replace('/login')} style={{ alignItems: 'center', marginTop: 8 }}>
                <Text style={{ color: '#6B7280', fontWeight: '500' }}>Back to Login</Text>
            </TouchableOpacity>
        </AuthScreen>
    );
}
