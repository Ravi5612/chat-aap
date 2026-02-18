import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { IconSymbol } from '@/components/ui/icon-symbol';
import AuthScreen from '@/components/ui/AuthScreen';

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
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            Alert.alert('Success', 'Password has been reset successfully! 👋');
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
        <AuthScreen title="Set new password" subtitle="Create a strong new password" loading={loading}>
            {/* New Password */}
            <View>
                <Text style={{ color: '#374151', fontWeight: '500', marginBottom: 8 }}>New Password</Text>
                <View style={{ position: 'relative', justifyContent: 'center' }}>
                    <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Min 6 characters"
                        secureTextEntry={!showPassword}
                        style={inputStyle}
                        editable={!loading}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 16 }}>
                        <IconSymbol name={showPassword ? "eye.slash.fill" : "eye.fill"} size={22} color="#687076" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Confirm Password */}
            <View>
                <Text style={{ color: '#374151', fontWeight: '500', marginBottom: 8 }}>Confirm New Password</Text>
                <View style={{ position: 'relative', justifyContent: 'center' }}>
                    <TextInput
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Confirm new password"
                        secureTextEntry={!showConfirmPassword}
                        style={inputStyle}
                        editable={!loading}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: 16 }}>
                        <IconSymbol name={showConfirmPassword ? "eye.slash.fill" : "eye.fill"} size={22} color="#687076" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Update Password Button */}
            <TouchableOpacity
                onPress={handleResetPassword}
                disabled={loading}
                style={{ width: '100%', backgroundColor: '#F68537', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8, elevation: 4 }}
                activeOpacity={0.8}
            >
                {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Update Password</Text>}
            </TouchableOpacity>
        </AuthScreen>
    );
}
