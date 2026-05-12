import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

export default function ChangePasswordScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    
    // Normal Change Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // Forgot Password Flow State
    const [step, setStep] = useState(1); // 1: Normal/Initial, 2: OTP Sent, 3: Set New Password after OTP
    const [otp, setOtp] = useState('');

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert("Error", "All fields are required");
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "New passwords do not match");
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert("Error", "Password must be at least 6 characters long");
            return;
        }

        setLoading(true);
        try {
            // Step 1: Verify current password by attempting to sign in
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword,
            });

            if (signInError) {
                throw new Error("Current password is incorrect");
            }

            // Step 2: Update to new password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success", "Password updated successfully!", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email);
            if (error) throw error;
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("OTP Sent", `A 6-digit reset code has been sent to ${user.email}`);
            setStep(2); // Move to OTP verification
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to send reset code");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (otp.length < 6) {
            Alert.alert("Error", "Please enter the 6-digit code");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.verifyOtp({
                email: user.email,
                token: otp,
                type: 'recovery'
            });

            if (error) throw error;

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setStep(3); // Move to Set New Password
        } catch (error: any) {
            Alert.alert("Error", "Invalid or expired code");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert("Error", "Please fill all fields");
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success", "Password reset successfully!", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to reset password");
        } finally {
            setLoading(false);
        }
    };

    const renderNormalFlow = () => (
        <View>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Current Password</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" />
                    <TextInput
                        style={styles.input}
                        placeholder="Enter current password"
                        secureTextEntry
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="key-outline" size={20} color="#94A3B8" />
                    <TextInput
                        style={styles.input}
                        placeholder="Minimum 6 characters"
                        secureTextEntry
                        value={newPassword}
                        onChangeText={setNewPassword}
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm New Password</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#94A3B8" />
                    <TextInput
                        style={styles.input}
                        placeholder="Re-type new password"
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                    />
                </View>
            </View>

            <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleChangePassword}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryButtonText}>Update Password</Text>}
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.forgotButton}
                onPress={handleForgotPassword}
                disabled={loading}
            >
                <Text style={styles.forgotButtonText}>Forgot Password?</Text>
            </TouchableOpacity>
        </View>
    );

    const renderOtpFlow = () => (
        <View style={styles.centered}>
            <MaterialCommunityIcons name="email-check-outline" size={64} color="#F68537" style={{ marginBottom: 20 }} />
            <Text style={styles.flowTitle}>Verify OTP</Text>
            <Text style={styles.flowSubtitle}>Enter the 6-digit code sent to your email</Text>
            
            <View style={[styles.inputContainer, { width: '80%', marginTop: 20 }]}>
                <TextInput
                    style={[styles.input, { textAlign: 'center', fontSize: 24, letterSpacing: 8 }]}
                    placeholder="000000"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                />
            </View>

            <TouchableOpacity
                style={[styles.primaryButton, { width: '80%', marginTop: 24 }]}
                onPress={handleVerifyOtp}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryButtonText}>Verify Code</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep(1)} style={{ marginTop: 20 }}>
                <Text style={{ color: '#94A3B8' }}>Cancel</Text>
            </TouchableOpacity>
        </View>
    );

    const renderResetFlow = () => (
        <View>
            <Text style={styles.flowTitle}>Reset Password</Text>
            <Text style={styles.flowSubtitle}>Create a new strong password for your account</Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="key-outline" size={20} color="#94A3B8" />
                    <TextInput
                        style={styles.input}
                        placeholder="Minimum 6 characters"
                        secureTextEntry
                        value={newPassword}
                        onChangeText={setNewPassword}
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm New Password</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#94A3B8" />
                    <TextInput
                        style={styles.input}
                        placeholder="Re-type new password"
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                    />
                </View>
            </View>

            <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleResetPassword}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryButtonText}>Reset Password</Text>}
            </TouchableOpacity>
        </View>
    );

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1, backgroundColor: '#FFFDFB' }}
        >
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
                        <Ionicons name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Account Security</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={{ padding: 24 }}>
                    <View style={styles.card}>
                        {step === 1 && renderNormalFlow()}
                        {step === 2 && renderOtpFlow()}
                        {step === 3 && renderResetFlow()}
                    </View>

                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle-outline" size={20} color="#64748B" />
                        <Text style={styles.infoText}>
                            After changing your password, you will stay logged in on this device.
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerIcon: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 5,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    input: {
        flex: 1,
        height: 54,
        marginLeft: 12,
        fontSize: 16,
        color: '#1E293B',
    },
    primaryButton: {
        backgroundColor: '#F68537',
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        shadowColor: '#F68537',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    forgotButton: {
        alignItems: 'center',
        marginTop: 20,
        padding: 10,
    },
    forgotButtonText: {
        color: '#F68537',
        fontWeight: '700',
        fontSize: 14,
    },
    centered: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    flowTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1E2937',
        marginBottom: 8,
    },
    flowSubtitle: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 20,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        padding: 16,
        borderRadius: 16,
        marginTop: 24,
        alignItems: 'center',
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
    }
});
