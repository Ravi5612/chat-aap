import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Hook
import { useChangePassword } from '@/hooks/auth/useChangePassword';

// Components
import ChangePasswordForm from '@/components/auth/ChangePasswordForm';
import { OtpVerifyForm, ResetPasswordForm } from '@/components/auth/PasswordFlowForms';

export default function ChangePasswordScreen() {
    const router = useRouter();
    const {
        loading, step, setStep,
        otp, setOtp,
        currentPassword, setCurrentPassword,
        newPassword, setNewPassword,
        confirmPassword, setConfirmPassword,
        handleChangePassword,
        handleForgotPassword,
        handleVerifyOtp,
        handleResetPassword,
    } = useChangePassword();

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
                        {step === 1 && (
                            <ChangePasswordForm
                                loading={loading}
                                currentPassword={currentPassword} setCurrentPassword={setCurrentPassword}
                                newPassword={newPassword} setNewPassword={setNewPassword}
                                confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
                                onSubmit={handleChangePassword}
                                onForgotPassword={handleForgotPassword}
                            />
                        )}
                        {step === 2 && (
                            <OtpVerifyForm
                                loading={loading}
                                otp={otp} setOtp={setOtp}
                                onVerify={handleVerifyOtp}
                                onCancel={() => setStep(1)}
                            />
                        )}
                        {step === 3 && (
                            <ResetPasswordForm
                                loading={loading}
                                newPassword={newPassword} setNewPassword={setNewPassword}
                                confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
                                onSubmit={handleResetPassword}
                            />
                        )}
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
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
    },
    headerIcon: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
    card: {
        backgroundColor: 'white', borderRadius: 24, padding: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05, shadowRadius: 15, elevation: 5,
    },
    infoBox: {
        flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 16,
        borderRadius: 16, marginTop: 24, alignItems: 'center', gap: 12,
    },
    infoText: { flex: 1, fontSize: 13, color: '#64748B', lineHeight: 18 },
});
