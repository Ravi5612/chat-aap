import React from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
    visible: boolean;
    onClose: () => void;
    passwordInput: string;
    setPasswordInput: (val: string) => void;
    isVerifying: boolean;
    onVerify: () => void;
    pendingToggleValue: boolean | null;
}

export const PasswordVerificationModal: React.FC<Props> = ({
    visible, onClose, passwordInput, setPasswordInput, isVerifying, onVerify, pendingToggleValue
}) => {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
            >
                <View style={{ backgroundColor: 'white', width: '100%', borderRadius: 24, padding: 24, alignItems: 'center' }}>
                    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                        <Ionicons name="lock-closed" size={32} color="#F68537" />
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 8, textAlign: 'center' }}>
                        Security Check
                    </Text>
                    <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
                        Please enter your ChatWarriors password to {pendingToggleValue ? 'enable' : 'disable'} the device tracker.
                    </Text>

                    <TextInput
                        style={{ width: '100%', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 16, fontSize: 16, color: '#1F2937', marginBottom: 24 }}
                        placeholder="Enter your password"
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry
                        value={passwordInput}
                        onChangeText={setPasswordInput}
                        autoFocus
                    />

                    <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
                        <TouchableOpacity 
                            style={{ flex: 1, padding: 16, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center' }}
                            onPress={onClose}
                            disabled={isVerifying}
                        >
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#4B5563' }}>Cancel</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={{ flex: 1, padding: 16, borderRadius: 16, backgroundColor: '#F68537', alignItems: 'center', opacity: (!passwordInput || isVerifying) ? 0.7 : 1 }}
                            onPress={onVerify}
                            disabled={!passwordInput || isVerifying}
                        >
                            {isVerifying ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: 'white' }}>Verify</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};
