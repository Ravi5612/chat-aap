import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { useAuthStore } from '@/store/useAuthStore';
import { LinearGradient } from 'expo-linear-gradient';

import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/lib/supabase';

import { Buffer } from 'buffer';

// Manual base64 to ArrayBuffer helper
function base64ToArrayBuffer(base64: string) {
    const binary = Buffer.from(base64, 'base64');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary[i];
    }
    return bytes.buffer;
}

const MESSAGE_TONES = [
    { id: 'default', name: 'Standard Ping', url: 'https://raw.githubusercontent.com/Anshuman71/chat-app/master/client/src/assets/notification.mp3' },
    { id: 'soft', name: 'Bubble Pop', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }, // Placeholder test
    { id: 'alert', name: 'Modern Alert', url: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg' },
];

const CALL_TONES = [
    { id: 'default', name: 'Classic Ring', url: 'https://www.w3schools.com/html/horse.mp3' }, // Just for testing connectivity
    { id: 'spiritual', name: 'Digital Phone', url: 'https://actions.google.com/sounds/v1/foley/phone_ringing.ogg' },
    { id: 'energetic', name: 'High Pulse', url: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg' },
];

export default function NotificationsScreen() {
    const router = useRouter();
    const { user, profile, updateProfile } = useAuthStore();
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [saving, setSaving] = useState(false);

    const playSound = async (id: string, url: string) => {
        try {
            if (sound) {
                await sound.unloadAsync();
            }
            setPlayingId(id);
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: url },
                { shouldPlay: true }
            );
            setSound(newSound);
            newSound.setOnPlaybackStatusUpdate((status: any) => {
                if (status.didJustFinish) setPlayingId(null);
            });
        } catch (error) {
            console.error('Error playing sound', error);
            setPlayingId(null);
        }
    };

    const handleSave = async (type: 'message' | 'call', url: string) => {
        setSaving(true);
        const updates = type === 'message' ? { message_tone: url } : { call_tone: url };
        await updateProfile(updates);
        setSaving(false);
    };

    const pickAndUploadTone = async (type: 'message' | 'call') => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'audio/*',
                copyToCacheDirectory: true
            });

            if (result.canceled) return;

            setSaving(true);
            const asset = result.assets[0];
            
            // Read file as base64
            const response = await fetch(asset.uri);
            const blob = await response.blob();
            const reader = new FileReader();
            
            const fileData: any = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            const base64 = fileData.split(',')[1];
            const fileName = `${user.id}/${Date.now()}_${asset.name}`;
            const filePath = `tones/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('media')
                .upload(filePath, base64ToArrayBuffer(base64), {
                    contentType: asset.mimeType || 'audio/mpeg',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('media')
                .getPublicUrl(filePath);

            await handleSave(type, publicUrl);
        } catch (error) {
            console.error('Error uploading custom tone:', error);
        } finally {
            setSaving(false);
        }
    };

    const renderToneItem = (item: any, type: 'message' | 'call') => {
        const isSelected = type === 'message' ? profile?.message_tone === item.url : profile?.call_tone === item.url;
        const isPlaying = playingId === item.id;

        return (
            <View 
                key={item.id} 
                style={[styles.toneItem, isSelected && styles.selectedTone]}
            >
                <TouchableOpacity 
                    onPress={() => isPlaying ? sound?.stopAsync() : playSound(item.id, item.url)}
                    style={[styles.playButtonWrapper, isSelected && { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                >
                    <Ionicons name={isPlaying ? "stop" : "play"} size={20} color={isSelected ? "white" : "#F68537"} />
                </TouchableOpacity>

                <View style={styles.toneInfo}>
                    <Text style={[styles.toneName, isSelected && styles.selectedText]}>{item.name}</Text>
                    {isSelected && <Text style={styles.currentLabel}>Active Tone</Text>}
                </View>
                
                <TouchableOpacity 
                    onPress={() => handleSave(type, item.url)}
                    style={[styles.setButton, isSelected ? styles.selectedSetButton : styles.unselectedSetButton]}
                >
                    <Text style={[styles.setButtonText, isSelected && { color: '#F68537' }]}>
                        {isSelected ? 'SET' : 'USE'}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={14} color="#F68537" />}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>MESSAGE TONES</Text>
                        <Text style={styles.sectionDesc}>Choose the sound you hear for new messages</Text>
                        {MESSAGE_TONES.map(tone => renderToneItem(tone, 'message'))}
                        
                        <TouchableOpacity 
                            style={styles.customUploadButton}
                            onPress={() => pickAndUploadTone('message')}
                        >
                            <Ionicons name="cloud-upload-outline" size={20} color="#F68537" />
                            <Text style={styles.customUploadText}>Choose from Device</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.section, { marginTop: 32 }]}>
                        <Text style={styles.sectionTitle}>CALL RINGTONES</Text>
                        <Text style={styles.sectionDesc}>Choose the ringtone for audio and video calls</Text>
                        {CALL_TONES.map(tone => renderToneItem(tone, 'call'))}

                        <TouchableOpacity 
                            style={styles.customUploadButton}
                            onPress={() => pickAndUploadTone('call')}
                        >
                            <Ionicons name="cloud-upload-outline" size={20} color="#F68537" />
                            <Text style={styles.customUploadText}>Choose from Device</Text>
                        </TouchableOpacity>
                    </View>

                    {saving && (
                        <View style={styles.savingOverlay}>
                            <ActivityIndicator color="#F68537" />
                            <Text style={styles.savingText}>Updating Tones...</Text>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFDFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    section: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#F68537',
        letterSpacing: 1.2,
        marginBottom: 4,
    },
    sectionDesc: {
        fontSize: 14,
        color: '#9CA3AF',
        marginBottom: 16,
    },
    toneItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    selectedTone: {
        backgroundColor: '#F68537',
        borderColor: '#F68537',
    },
    toneInfo: {
        flex: 1,
    },
    toneName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    selectedText: {
        color: 'white',
    },
    currentLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: 'bold',
        marginTop: 2,
    },
    playButtonWrapper: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFF9F1',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    setButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    selectedSetButton: {
        backgroundColor: 'white',
    },
    unselectedSetButton: {
        backgroundColor: '#FFF9F1',
        borderWidth: 1,
        borderColor: '#F68537',
    },
    setButtonText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#F68537',
    },
    savingOverlay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        gap: 8,
    },
    savingText: {
        color: '#F68537',
        fontWeight: '600',
    },
    customUploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: '#FFF9F1',
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#F68537',
        marginTop: 8,
        gap: 10,
    },
    customUploadText: {
        color: '#F68537',
        fontWeight: 'bold',
        fontSize: 14,
    }
});
