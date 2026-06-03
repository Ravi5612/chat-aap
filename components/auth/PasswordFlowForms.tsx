import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';

interface OtpVerifyFormProps {
    loading: boolean;
    otp: string; setOtp: (v: string) => void;
    onVerify: () => void;
    onCancel: () => void;
}

export const OtpVerifyForm = React.memo(function OtpVerifyForm({ loading, otp, setOtp, onVerify, onCancel }: OtpVerifyFormProps) {
    return (
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
                onPress={onVerify}
                disabled={loading}
            >
                {loading
                    ? <ActivityIndicator color="white" />
                    : <Text style={styles.primaryButtonText}>Verify Code</Text>
                }
            </TouchableOpacity>

            <TouchableOpacity onPress={onCancel} style={{ marginTop: 20 }}>
                <Text style={{ color: '#94A3B8' }}>Cancel</Text>
            </TouchableOpacity>
        </View>
    );
});

interface ResetPasswordFormProps {
    loading: boolean;
    newPassword: string; setNewPassword: (v: string) => void;
    confirmPassword: string; setConfirmPassword: (v: string) => void;
    onSubmit: () => void;
}

export const ResetPasswordForm = React.memo(function ResetPasswordForm({
    loading, newPassword, setNewPassword, confirmPassword, setConfirmPassword, onSubmit
}: ResetPasswordFormProps) {
    return (
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

            <TouchableOpacity style={styles.primaryButton} onPress={onSubmit} disabled={loading}>
                {loading
                    ? <ActivityIndicator color="white" />
                    : <Text style={styles.primaryButtonText}>Reset Password</Text>
                }
            </TouchableOpacity>
        </View>
    );
});

const styles = StyleSheet.create({
    centered: { alignItems: 'center', paddingVertical: 20 },
    flowTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E2937', marginBottom: 8 },
    flowSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 20 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8, marginLeft: 4 },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
        borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E2E8F0',
    },
    input: { flex: 1, height: 54, marginLeft: 12, fontSize: 16, color: '#1E293B' },
    primaryButton: {
        backgroundColor: '#F68537', height: 56, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center', marginTop: 10,
        shadowColor: '#F68537', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    primaryButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
