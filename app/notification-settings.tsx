import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';

// Hooks
import { useTonePlayer } from '@/hooks/notifications/useTonePlayer';
import { useToneUploader } from '@/hooks/notifications/useToneUploader';

// Components
import ToneSection from '@/components/notifications/ToneSection';

const MESSAGE_TONES = [
    { id: 'default', name: 'Standard Ping', url: 'https://raw.githubusercontent.com/Anshuman71/chat-app/master/client/src/assets/notification.mp3' },
    { id: 'soft', name: 'Bubble Pop', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { id: 'alert', name: 'Modern Alert', url: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg' },
];

const CALL_TONES = [
    { id: 'default', name: 'Classic Ring', url: 'https://www.w3schools.com/html/horse.mp3' },
    { id: 'spiritual', name: 'Digital Phone', url: 'https://actions.google.com/sounds/v1/foley/phone_ringing.ogg' },
    { id: 'energetic', name: 'High Pulse', url: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg' },
];

export default function NotificationSettingsScreen() {
    const router = useRouter();
    const { user, profile, updateProfile, syncProfile } = useAuthStore();
    
    const { playingId, playSound, stopSound } = useTonePlayer();
    const { saving, handleSave, pickAndUploadTone } = useToneUploader(user, updateProfile);

    useEffect(() => {
        syncProfile();
    }, [syncProfile]);

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
                    
                    <ToneSection 
                        title="MESSAGE TONES"
                        description="Choose the sound you hear for new messages"
                        tones={MESSAGE_TONES}
                        type="message"
                        currentToneUrl={profile?.message_tone}
                        playingId={playingId}
                        onPlaySound={playSound}
                        onStopSound={stopSound}
                        onSaveTone={handleSave}
                        onUploadTone={pickAndUploadTone}
                    />

                    <ToneSection 
                        title="CALL RINGTONES"
                        description="Choose the ringtone for audio and video calls"
                        tones={CALL_TONES}
                        type="call"
                        currentToneUrl={profile?.call_tone}
                        playingId={playingId}
                        onPlaySound={playSound}
                        onStopSound={stopSound}
                        onSaveTone={handleSave}
                        onUploadTone={pickAndUploadTone}
                        marginTop={32}
                    />

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
    }
});
