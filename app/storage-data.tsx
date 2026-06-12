import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function StorageDataScreen() {
    const router = useRouter();
    const { 
        autoDownloadPhotos, 
        autoDownloadVideos, 
        autoDownloadAudio, 
        autoDownloadDocuments, 
        toggleSetting,
        loadSettings
    } = useSettingsStore();

    useEffect(() => {
        loadSettings();
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Storage and Data</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>MEDIA AUTO-DOWNLOAD</Text>
                    <Text style={styles.sectionDescription}>
                        Voice messages are always automatically downloaded for the best communication experience.
                    </Text>

                    <View style={styles.settingRow}>
                        <View style={styles.settingTextContainer}>
                            <Text style={styles.settingLabel}>Photos</Text>
                            <Text style={styles.settingSubtext}>Download images automatically</Text>
                        </View>
                        <Switch
                            value={autoDownloadPhotos}
                            onValueChange={(val) => toggleSetting('autoDownloadPhotos', val)}
                            trackColor={{ false: '#E5E7EB', true: '#FDBA74' }}
                            thumbColor={autoDownloadPhotos ? '#F68537' : '#9CA3AF'}
                        />
                    </View>

                    <View style={styles.settingRow}>
                        <View style={styles.settingTextContainer}>
                            <Text style={styles.settingLabel}>Videos</Text>
                            <Text style={styles.settingSubtext}>Download videos automatically</Text>
                        </View>
                        <Switch
                            value={autoDownloadVideos}
                            onValueChange={(val) => toggleSetting('autoDownloadVideos', val)}
                            trackColor={{ false: '#E5E7EB', true: '#FDBA74' }}
                            thumbColor={autoDownloadVideos ? '#F68537' : '#9CA3AF'}
                        />
                    </View>

                    <View style={styles.settingRow}>
                        <View style={styles.settingTextContainer}>
                            <Text style={styles.settingLabel}>Audio</Text>
                            <Text style={styles.settingSubtext}>Download audio files automatically</Text>
                        </View>
                        <Switch
                            value={autoDownloadAudio}
                            onValueChange={(val) => toggleSetting('autoDownloadAudio', val)}
                            trackColor={{ false: '#E5E7EB', true: '#FDBA74' }}
                            thumbColor={autoDownloadAudio ? '#F68537' : '#9CA3AF'}
                        />
                    </View>

                    <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                        <View style={styles.settingTextContainer}>
                            <Text style={styles.settingLabel}>Documents</Text>
                            <Text style={styles.settingSubtext}>Download documents automatically</Text>
                        </View>
                        <Switch
                            value={autoDownloadDocuments}
                            onValueChange={(val) => toggleSetting('autoDownloadDocuments', val)}
                            trackColor={{ false: '#E5E7EB', true: '#FDBA74' }}
                            thumbColor={autoDownloadDocuments ? '#F68537' : '#9CA3AF'}
                        />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
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
    backBtn: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    content: {
        padding: 20,
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#F68537',
        marginBottom: 8,
        letterSpacing: 1,
    },
    sectionDescription: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 20,
        lineHeight: 18,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    settingTextContainer: {
        flex: 1,
        paddingRight: 16,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    settingSubtext: {
        fontSize: 13,
        color: '#9CA3AF',
        marginTop: 4,
    },
});
