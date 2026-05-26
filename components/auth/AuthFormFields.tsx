import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AuthFormFieldsProps {
    isSignUp: boolean;
    isForgotPassword: boolean;
    loading: boolean;
    // Fields
    identifier: string; setIdentifier: (v: string) => void;
    email: string; setEmail: (v: string) => void;
    phone: string; setPhone: (v: string) => void;
    password: string; setPassword: (v: string) => void;
    showPassword: boolean; setShowPassword: (v: boolean) => void;
    resetEmail: string; setResetEmail: (v: string) => void;
    onForgotPassword: () => void;
}

export default function AuthFormFields({
    isSignUp,
    isForgotPassword,
    loading,
    identifier, setIdentifier,
    email, setEmail,
    phone, setPhone,
    password, setPassword,
    showPassword, setShowPassword,
    resetEmail, setResetEmail,
    onForgotPassword,
}: AuthFormFieldsProps) {

    const inputStyle = styles.input;

    if (isForgotPassword) {
        return (
            <>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={inputStyle}
                    editable={!loading}
                />
            </>
        );
    }

    return (
        <>
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
            <View style={{ position: 'relative', width: '100%' }}>
                <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Secret password"
                    secureTextEntry={!showPassword}
                    style={[inputStyle, { paddingRight: 50 }]}
                    editable={!loading}
                />
                <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                >
                    <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={22}
                        color="#9CA3AF"
                    />
                </TouchableOpacity>
            </View>

            {!isSignUp && (
                <TouchableOpacity
                    onPress={onForgotPassword}
                    style={{ alignSelf: 'flex-end', marginBottom: 16 }}
                >
                    <Text style={{ color: '#F68537', fontWeight: '600' }}>Forgot Password?</Text>
                </TouchableOpacity>
            )}
        </>
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
    input: {
        width: '100%',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        fontSize: 16,
        backgroundColor: 'white',
        marginBottom: 16,
    },
    eyeBtn: {
        position: 'absolute',
        right: 12,
        top: 12,
        padding: 4,
    }
});
