import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';

type AboutPrivacy = 'everyone' | 'friends' | 'nobody';

export default function AboutPrivacyScreen() {
    const router = useRouter();
    const profile = useAuthStore(state => state.profile);
    const updateProfile = useAuthStore(state => state.updateProfile);
    
    // Local state for instant UI updates
    const [privacy, setPrivacy] = useState<AboutPrivacy>(profile?.about_privacy || 'everyone');

    const handlePrivacyChange = async (newPrivacy: AboutPrivacy) => {
        setPrivacy(newPrivacy);
        await updateProfile({ about_privacy: newPrivacy });
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#FFFDFB' }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
                        <Ionicons name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>About / Bio</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
                    <Text style={styles.sectionLabel}>WHO CAN SEE MY ABOUT INFO</Text>

                    <View style={styles.card}>
                        <TouchableOpacity style={styles.radioOption} onPress={() => handlePrivacyChange('everyone')}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.optionTitle}>Everyone</Text>
                                <Text style={styles.optionDesc}>Anyone on ChatWarriors can see your about info</Text>
                            </View>
                            <View style={[styles.radioCircle, privacy === 'everyone' && styles.radioSelected]}>
                                {privacy === 'everyone' && <View style={styles.radioInner} />}
                            </View>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.radioOption} onPress={() => handlePrivacyChange('friends')}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.optionTitle}>My Friends</Text>
                                <Text style={styles.optionDesc}>Only your approved friends can see your about info</Text>
                            </View>
                            <View style={[styles.radioCircle, privacy === 'friends' && styles.radioSelected]}>
                                {privacy === 'friends' && <View style={styles.radioInner} />}
                            </View>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.radioOption} onPress={() => handlePrivacyChange('nobody')}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.optionTitle}>Nobody</Text>
                                <Text style={styles.optionDesc}>Hide your about info from everyone</Text>
                            </View>
                            <View style={[styles.radioCircle, privacy === 'nobody' && styles.radioSelected]}>
                                {privacy === 'nobody' && <View style={styles.radioInner} />}
                            </View>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
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
        borderBottomColor: '#F3F4F6'
    },
    headerIcon: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#9CA3AF',
        marginBottom: 12,
        letterSpacing: 1,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 4,
    },
    optionDesc: {
        fontSize: 13,
        color: '#9CA3AF',
        lineHeight: 18,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginLeft: 16,
    },
    radioCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 16,
    },
    radioSelected: {
        borderColor: '#F68537',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#F68537',
    }
});

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
