import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface CinemaInviteModalProps {
    visible: boolean;
    onClose: () => void;
    onStart: (videoId: string) => void;
}

export default function CinemaInviteModal({ visible, onClose, onStart }: CinemaInviteModalProps) {
    const [link, setLink] = useState('');
    const [error, setError] = useState('');

    const extractVideoId = (url: string) => {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const match = url.match(regex);
        return match ? match[1] : null;
    };

    const handleStart = () => {
        if (!link.trim()) {
            setError('Please paste a YouTube link first.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        const videoId = extractVideoId(link);
        if (!videoId) {
            setError('Invalid YouTube link. Please check the URL.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        setError('');
        setLink(''); // Reset for next time
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onStart(videoId);
        onClose();
    };

    const handleClose = () => {
        setLink('');
        setError('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={handleClose}
        >
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                <View style={styles.overlay}>
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.keyboardView}
                    >
                        <View style={styles.card}>
                            {/* Close Button */}
                            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>

                            {/* Header Icon */}
                            <View style={styles.iconContainer}>
                                <FontAwesome5 name="film" size={32} color="#EAB308" />
                            </View>

                            <Text style={styles.title}>Start Cinema Mode</Text>
                            <Text style={styles.subtitle}>Watch YouTube videos together in perfect sync with your friends!</Text>

                            {/* Input Area */}
                            <View style={styles.inputContainer}>
                                <Ionicons name="link" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Paste YouTube Link here..."
                                    placeholderTextColor="#9CA3AF"
                                    value={link}
                                    onChangeText={(text) => {
                                        setLink(text);
                                        setError('');
                                    }}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                            
                            {error ? <Text style={styles.errorText}>{error}</Text> : null}

                            {/* Action Button */}
                            <TouchableOpacity 
                                style={[styles.startBtn, !link.trim() && styles.startBtnDisabled]} 
                                onPress={handleStart}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.startBtnText}>Start Watch Party</Text>
                                <Ionicons name="arrow-forward" size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyboardView: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    card: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 4,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FEF08A',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 50,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 8,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        color: '#1F2937',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        alignSelf: 'flex-start',
        marginLeft: 4,
        marginBottom: 16,
    },
    startBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EAB308',
        width: '100%',
        height: 50,
        borderRadius: 25,
        marginTop: 16,
        gap: 8,
    },
    startBtnDisabled: {
        backgroundColor: '#FCD34D',
    },
    startBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
