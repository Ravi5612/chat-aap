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
    confirmPassword?: string; setConfirmPassword?: (v: string) => void;
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
    confirmPassword, setConfirmPassword,
    showPassword, setShowPassword,
    resetEmail, setResetEmail,
    onForgotPassword,
}: AuthFormFieldsProps) {

    const inputStyle = styles.input;

    if (isForgotPassword) {
        return (
            <>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={20} color="#F68537" style={styles.iconLeft} />
                    <TextInput
                        value={resetEmail}
                        onChangeText={setResetEmail}
                        placeholder="you@example.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={styles.input}
                        editable={!loading}
                    />
                </View>
            </>
        );
    }

    return (
        <>
            {isSignUp ? (
                <>
                    <Text style={styles.label}>Email Address</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="mail-outline" size={20} color="#F68537" style={styles.iconLeft} />
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            placeholder="you@example.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            style={styles.input}
                            editable={!loading}
                        />
                    </View>
                    <Text style={styles.label}>Phone Number</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="call-outline" size={20} color="#F68537" style={styles.iconLeft} />
                        <TextInput
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="For your friends to find you"
                            keyboardType="phone-pad"
                            style={styles.input}
                            editable={!loading}
                        />
                    </View>
                </>
            ) : (
                <>
                    <Text style={styles.label}>Username / Mobile Number</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="person-outline" size={20} color="#F68537" style={styles.iconLeft} />
                        <TextInput
                            value={identifier}
                            onChangeText={setIdentifier}
                            placeholder="Enter username or phone"
                            autoCapitalize="none"
                            style={styles.input}
                            editable={!loading}
                        />
                    </View>
                </>
            )}

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#F68537" style={styles.iconLeft} />
                <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Secret password"
                    secureTextEntry={!showPassword}
                    style={styles.input}
                    editable={!loading}
                />
                <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                >
                    <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={22}
                        color="#F68537"
                    />
                </TouchableOpacity>
            </View>

            {isSignUp && setConfirmPassword && confirmPassword !== undefined && (
                <>
                    <Text style={styles.label}>Confirm Password</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={20} color="#F68537" style={styles.iconLeft} />
                        <TextInput
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Confirm your secret password"
                            secureTextEntry={!showPassword}
                            style={styles.input}
                            editable={!loading}
                        />
                    </View>
                </>
            )}

            {!isSignUp && (
                <TouchableOpacity
                    onPress={onForgotPassword}
                    style={{ alignSelf: 'center', marginTop: 8, marginBottom: 16 }}
                >
                    <Text style={{ color: '#1F2937', fontWeight: '500', fontSize: 14 }}>Forgot Password?</Text>
                </TouchableOpacity>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    label: {
        color: '#F68537',
        fontWeight: '600',
        marginBottom: 8,
        fontSize: 14,
        paddingLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: '#F68537',
        borderRadius: 25,
        backgroundColor: '#FFFFFF',
        marginBottom: 16,
        paddingHorizontal: 16,
        height: 50,
        shadowColor: '#F68537',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    iconLeft: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
    },
    eyeBtn: {
        padding: 4,
    }
});
