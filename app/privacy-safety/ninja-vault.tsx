import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFriendsStore } from '@/store/useFriendsStore';

export default function NinjaVaultScreen() {
    const router = useRouter();
    const vaultPasscode = useFriendsStore(state => state.vaultPasscode);
    const setVaultPasscode = useFriendsStore(state => state.setVaultPasscode);
    const [passcode, setPasscode] = useState('');
    const [isExisting, setIsExisting] = useState(false);

    useEffect(() => {
        if (vaultPasscode) {
            setPasscode(vaultPasscode);
            setIsExisting(true);
        }
    }, [vaultPasscode]);

    const handleSave = async () => {
        if (!passcode) {
            Alert.alert('Error', 'Passcode cannot be empty.');
            return;
        }

        const firstChar = passcode.charAt(0);
        // Rule: Passcode must start with a special character
        if (/[a-zA-Z0-9]/.test(firstChar)) {
            Alert.alert('Invalid Passcode', 'For maximum stealth, your Ninja Vault passcode MUST start with a special character (e.g., *, ., #). This prevents accidental unlocking when searching for normal names.');
            return;
        }

        await setVaultPasscode(passcode);
        Alert.alert('Success', 'Ninja Vault passcode saved successfully. Hide chats from their menu, and search this passcode to unlock them.', [
            { text: 'OK', onPress: () => router.back() }
        ]);
    };

    const handleTurnOff = async () => {
        Alert.alert(
            'Turn Off Ninja Vault',
            'This will delete your passcode. You must manually unhide your chats before turning this off, otherwise they will remain hidden. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Turn Off',
                    style: 'destructive',
                    onPress: async () => {
                        await setVaultPasscode(null);
                        setPasscode('');
                        setIsExisting(false);
                        Alert.alert('Turned Off', 'Ninja Vault is now disabled.');
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFDFB' }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
                        <Ionicons name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Ninja Vault</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView style={{ flex: 1, padding: 24 }}>
                    <View style={{ alignItems: 'center', marginBottom: 32 }}>
                        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                            <Ionicons name="eye-off-outline" size={40} color="white" />
                        </View>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 }}>Hardcore Stealth</Text>
                        <Text style={{ textAlign: 'center', color: '#6B7280', fontSize: 15, lineHeight: 22 }}>
                            Chats added to the Ninja Vault are completely invisible. There are no notifications or hints. To open the vault, search your exact passcode in the home screen.
                        </Text>
                    </View>

                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8, marginTop: 16 }}>
                        SET YOUR PASSCODE
                    </Text>
                    
                    <View style={styles.inputContainer}>
                        <Ionicons name="key-outline" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. *007 or .secret"
                            value={passcode}
                            onChangeText={setPasscode}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>
                    <Text style={{ fontSize: 12, color: '#F59E0B', marginTop: 8, marginBottom: 24 }}>
                        ⚠️ Rule: Passcode MUST start with a special character like *, ., or #.
                    </Text>

                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>Save Passcode</Text>
                    </TouchableOpacity>

                    {isExisting && (
                        <TouchableOpacity style={styles.turnOffButton} onPress={handleTurnOff}>
                            <Text style={styles.turnOffButtonText}>Turn Off Ninja Vault</Text>
                        </TouchableOpacity>
                    )}

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFDFB',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerIcon: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
    },
    saveButton: {
        backgroundColor: '#111827',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 12,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    turnOffButton: {
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#FCA5A5',
    },
    turnOffButtonText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
