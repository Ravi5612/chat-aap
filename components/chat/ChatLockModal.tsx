import React, { useState, useEffect, useCallback, memo } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';

const CHAT_LOCK_KEY = 'chat_lock_password';
const CHAT_LOCK_QUESTION_KEY = 'chat_lock_question';
const CHAT_LOCK_ANSWER_KEY = 'chat_lock_answer';

// ─── Sub-components (memoized) ────────────────────────────────────────────────

const SetupForm = memo(({ password, confirmPassword, question, answer, onPassword, onConfirm, onQuestion, onAnswer, onSubmit }: any) => (
    <View style={styles.form}>
        <Text style={styles.title}>Set Chat Lock</Text>
        <Text style={styles.subtitle}>Enter a password to protect your locked chats</Text>

        <TextInput style={styles.input} placeholder="New Password" secureTextEntry keyboardType="number-pad" value={password} onChangeText={onPassword} />
        <TextInput style={styles.input} placeholder="Confirm Password" secureTextEntry keyboardType="number-pad" value={confirmPassword} onChangeText={onConfirm} />

        <View style={styles.divider} />
        <Text style={styles.subtitle}>Recovery: Set a security question</Text>
        <TextInput style={styles.input} placeholder="e.g., What is your pet's name?" value={question} onChangeText={onQuestion} />
        <TextInput style={styles.input} placeholder="Your Answer" value={answer} onChangeText={onAnswer} />

        <TouchableOpacity style={styles.primaryBtn} onPress={onSubmit}>
            <Text style={styles.primaryBtnText}>Save Settings</Text>
        </TouchableOpacity>
    </View>
));

const VerifyForm = memo(({ password, onPassword, onVerify, onForgot }: any) => (
    <View style={styles.form}>
        <MaterialCommunityIcons name="lock-outline" size={64} color="#F68537" style={styles.lockIcon} />
        <Text style={styles.title}>Chat Locked</Text>
        <Text style={styles.subtitle}>Enter your password to unlock this chat</Text>

        <TextInput
            style={styles.pinInput}
            placeholder="****"
            secureTextEntry
            keyboardType="number-pad"
            autoFocus
            value={password}
            onChangeText={onPassword}
        />

        <TouchableOpacity style={styles.primaryBtn} onPress={onVerify}>
            <Text style={styles.primaryBtnText}>Unlock</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.textBtn} onPress={onForgot}>
            <Text style={styles.textBtnText}>Forgot Password?</Text>
        </TouchableOpacity>
    </View>
));

const RecoverForm = memo(({ storedQuestion, answer, onAnswer, onRecover, onBack }: any) => (
    <View style={styles.form}>
        <Text style={styles.title}>Recover Password</Text>
        <Text style={styles.subtitle}>Answer your security question</Text>

        <View style={styles.questionBox}>
            <Text style={styles.questionText}>{storedQuestion || 'No question set'}</Text>
        </View>

        <TextInput style={styles.input} placeholder="Your Answer" value={answer} onChangeText={onAnswer} />

        <TouchableOpacity style={styles.primaryBtn} onPress={onRecover}>
            <Text style={styles.primaryBtnText}>Verify Answer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.textBtn} onPress={onBack}>
            <Text style={styles.textBtnText}>Back to Login</Text>
        </TouchableOpacity>
    </View>
));

// ─── Main component ───────────────────────────────────────────────────────────

interface ChatLockModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    mode: 'verify' | 'setup' | 'recover';
}

const ChatLockModal = memo(({ visible, onClose, onSuccess, mode: initialMode }: ChatLockModalProps) => {
    const [mode, setMode] = useState(initialMode);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [storedQuestion, setStoredQuestion] = useState('');

    useEffect(() => {
        if (visible) {
            setMode(initialMode);
            setPassword('');
            setConfirmPassword('');
            loadQuestion();
        }
    }, [visible, initialMode]);

    const loadQuestion = async () => {
        const q = await SecureStore.getItemAsync(CHAT_LOCK_QUESTION_KEY);
        if (q) setStoredQuestion(q);
    };

    const handleSetup = useCallback(async () => {
        if (password.length < 4) { Alert.alert('Error', 'Password must be at least 4 digits'); return; }
        if (password !== confirmPassword) { Alert.alert('Error', 'Passwords do not match'); return; }
        if (!question || !answer) { Alert.alert('Error', 'Please set a security question and answer'); return; }
        try {
            await SecureStore.setItemAsync(CHAT_LOCK_KEY, password);
            await SecureStore.setItemAsync(CHAT_LOCK_QUESTION_KEY, question);
            await SecureStore.setItemAsync(CHAT_LOCK_ANSWER_KEY, answer.toLowerCase().trim());
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', 'Chat Lock set up successfully!');
            onSuccess();
        } catch (e) { Alert.alert('Error', 'Failed to save lock settings'); }
    }, [password, confirmPassword, question, answer, onSuccess]);

    const handleVerify = useCallback(async () => {
        const storedPassword = await SecureStore.getItemAsync(CHAT_LOCK_KEY);
        if (password === storedPassword) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onSuccess();
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Incorrect Password', 'Please try again.');
            setPassword('');
        }
    }, [password, onSuccess]);

    const handleRecover = useCallback(async () => {
        const storedAnswer = await SecureStore.getItemAsync(CHAT_LOCK_ANSWER_KEY);
        if (answer.toLowerCase().trim() === storedAnswer) {
            setMode('setup'); setAnswer(''); setPassword('');
            Alert.alert('Verified', 'You can now set a new password.');
        } else {
            Alert.alert('Incorrect Answer', 'Recovery failed.');
        }
    }, [answer]);

    const goToRecover = useCallback(() => setMode('recover'), []);
    const goToVerify  = useCallback(() => setMode('verify'),  []);

    const kbBehavior = Platform.OS === 'ios' ? 'padding' : 'height';

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={kbBehavior} style={styles.overlay}>
                <View style={styles.container}>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>

                    {mode === 'setup' && (
                        <SetupForm
                            password={password} confirmPassword={confirmPassword}
                            question={question} answer={answer}
                            onPassword={setPassword} onConfirm={setConfirmPassword}
                            onQuestion={setQuestion} onAnswer={setAnswer}
                            onSubmit={handleSetup}
                        />
                    )}
                    {mode === 'verify' && (
                        <VerifyForm
                            password={password}
                            onPassword={setPassword}
                            onVerify={handleVerify}
                            onForgot={goToRecover}
                        />
                    )}
                    {mode === 'recover' && (
                        <RecoverForm
                            storedQuestion={storedQuestion}
                            answer={answer}
                            onAnswer={setAnswer}
                            onRecover={handleRecover}
                            onBack={goToVerify}
                        />
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
});

export default ChatLockModal;


const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: 'white',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 32,
        minHeight: 400,
    },
    closeBtn: {
        alignSelf: 'flex-end',
        padding: 8,
    },
    form: {
        gap: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F3F4F6',
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        color: '#1F2937',
    },
    primaryBtn: {
        backgroundColor: '#F68537',
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        marginTop: 10,
    },
    primaryBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    textBtn: {
        alignItems: 'center',
        padding: 10,
    },
    textBtnText: {
        color: '#F68537',
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 10,
    },
    questionBox: {
        backgroundColor: '#FFF7ED',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FFEDD5',
    },
    questionText: {
        fontSize: 16,
        color: '#C2410C',
        fontWeight: '600',
        textAlign: 'center',
    },
    lockIcon: { alignSelf: 'center', marginBottom: 20 },
    pinInput: {
        backgroundColor: '#F3F4F6', borderRadius: 16, padding: 16,
        fontSize: 24, color: '#1F2937', textAlign: 'center', letterSpacing: 10,
    },
});
