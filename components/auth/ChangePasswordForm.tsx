import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChangePasswordFormProps {
    loading: boolean;
    currentPassword: string; setCurrentPassword: (v: string) => void;
    newPassword: string; setNewPassword: (v: string) => void;
    confirmPassword: string; setConfirmPassword: (v: string) => void;
    onSubmit: () => void;
    onForgotPassword: () => void;
}

const ChangePasswordForm = ({
    loading,
    currentPassword, setCurrentPassword,
    newPassword, setNewPassword,
    confirmPassword, setConfirmPassword,
    onSubmit,
    onForgotPassword,
}: ChangePasswordFormProps) => {
    return (
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

            <TouchableOpacity style={styles.primaryButton} onPress={onSubmit} disabled={loading}>
                {loading
                    ? <ActivityIndicator color="white" />
                    : <Text style={styles.primaryButtonText}>Update Password</Text>
                }
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotButton} onPress={onForgotPassword} disabled={loading}>
                <Text style={styles.forgotButtonText}>Forgot Password?</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
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
    forgotButton: { alignItems: 'center', marginTop: 20, padding: 10 },
    forgotButtonText: { color: '#F68537', fontWeight: '700', fontSize: 14 },
});

export default React.memo(ChangePasswordForm);
