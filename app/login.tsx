import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import AuthScreen from '@/components/ui/AuthScreen';
import AuthFormFields from '@/components/auth/AuthFormFields';
import { useAuthForm } from '@/hooks/auth/useAuthForm';

export default function LoginPage() {
    const {
        loading,
        identifier, setIdentifier,
        email, setEmail,
        phone, setPhone,
        password, setPassword,
        confirmPassword, setConfirmPassword,
        showPassword, setShowPassword,
        isSignUp,
        isForgotPassword, setIsForgotPassword,
        resetEmail, setResetEmail,
        handleAuth,
        toggleMode,
    } = useAuthForm();

    const title = isForgotPassword ? "Reset Password" : isSignUp ? "Create Account" : "Welcome Back";
    const subtitle = isForgotPassword ? "We'll send a link to your email" : isSignUp ? "Join Chat Warriors today!" : "Login to your account";
    const btnLabel = isForgotPassword ? "Send Reset Link" : isSignUp ? "Sign Up" : "Login";
    const toggleLabel = isForgotPassword
        ? "Back to Login"
        : isSignUp ? "Already have an account? " : "Don't have an account? ";
    const toggleAction = isForgotPassword ? "" : isSignUp ? "Login here" : "Sign Up";

    return (
        <View style={{ flex: 1 }}>
            <AuthScreen title={title} subtitle={subtitle} loading={loading}>
                <View>
                    <AuthFormFields
                        isSignUp={isSignUp}
                        isForgotPassword={isForgotPassword}
                        loading={loading}
                        identifier={identifier} setIdentifier={setIdentifier}
                        email={email} setEmail={setEmail}
                        phone={phone} setPhone={setPhone}
                        password={password} setPassword={setPassword}
                        confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
                        showPassword={showPassword} setShowPassword={setShowPassword}
                        resetEmail={resetEmail} setResetEmail={setResetEmail}
                        onForgotPassword={() => setIsForgotPassword(true)}
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
                            <Text style={styles.actionButtonText}>{btnLabel}</Text>
                        )}
                    </TouchableOpacity>

                    <Text style={{ textAlign: 'center', marginTop: 10, color: '#F68537', fontSize: 12, fontWeight: 'bold' }}>
                        OTA Update: Magic Successful! ✨ (v1.1.0)
                    </Text>

                    <TouchableOpacity
                        onPress={toggleMode}
                        style={{ alignItems: 'center', marginTop: 24, padding: 10 }}
                    >
                        <Text style={{ color: '#6B7280', fontSize: 15 }}>
                            {toggleLabel}
                            <Text style={{ color: '#F68537', fontWeight: 'bold' }}>
                                {toggleAction}
                            </Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </AuthScreen>
        </View>
    );
}

const styles = StyleSheet.create({
    actionButton: {
        width: '100%',
        backgroundColor: '#F68537',
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
