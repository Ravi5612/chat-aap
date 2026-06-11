import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { useFriendsStore } from '@/store/useFriendsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useTrackerPassword } from '@/hooks/privacy/useTrackerPassword';

import { PrivacyCard } from '@/components/privacy/PrivacyCard';
import { PasswordVerificationModal } from '@/components/privacy/PasswordVerificationModal';

export default function PrivacySafetyScreen() {
    const router = useRouter();
    const profile = useAuthStore(state => state.profile);
    const updateProfile = useAuthStore(state => state.updateProfile);
    const blockedUserIds = useFriendsStore(state => state.blockedUserIds);

    const {
        trackerEnabled, showPasswordModal, setShowPasswordModal,
        passwordInput, setPasswordInput, isVerifying, pendingToggleValue, setPendingToggleValue,
        handleToggleAttempt, verifyPasswordAndToggle
    } = useTrackerPassword();

    return (
        <View style={{ flex: 1, backgroundColor: '#FFFDFB' }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
                        <Ionicons name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Privacy & Safety</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }}>
                    <View style={styles.heroSection}>
                        <LinearGradient
                            colors={['#FFF7ED', '#FFFDFB']}
                            style={styles.heroBadge}
                        >
                            <MaterialCommunityIcons name="security" size={48} color="#F68537" />
                        </LinearGradient>
                        <Text style={styles.heroTitle}>Your Safety Matters</Text>
                        <Text style={styles.heroText}>
                            We're committed to keeping your data and conversations secure. Follow these tips to enhance your security.
                        </Text>
                    </View>

                    <Text style={styles.sectionLabel}>COMMUNITY RESCUE (SOS)</Text>

                    <PrivacyCard
                        type="switch"
                        iconName="shield-sword"
                        iconLib="material"
                        iconColor="#F68537"
                        bgColor="#F6853710"
                        title="Become a Warrior 🛡️"
                        desc="Opt-in to receive SOS alerts from users in danger within 5KM."
                        value={profile?.is_warrior ?? false}
                        onValueChange={(val) => updateProfile({ is_warrior: val })}
                        extraContent={
                            (profile?.missions_completed || 0) > 0 && (
                                <Text style={{ fontSize: 12, color: '#10B981', marginTop: 4, fontWeight: 'bold' }}>
                                    🎖️ Missions Completed: {profile?.missions_completed}
                                </Text>
                            )
                        }
                    />

                    <Text style={styles.sectionLabel}>DISCOVERY & NOTIFICATIONS</Text>

                    <PrivacyCard
                        type="switch"
                        iconName="radar"
                        iconLib="material"
                        iconColor="#10B981"
                        bgColor="#10B98110"
                        title="Nearby Discovery"
                        desc="Get notified when other warriors are within 1KM of you."
                        value={profile?.nearby_notifications_enabled ?? false}
                        onValueChange={(val) => updateProfile({ nearby_notifications_enabled: val })}
                        trackColors={{ false: '#E5E7EB', true: '#D1FAE5' }}
                        thumbColors={{ false: '#FFFFFF', true: '#10B981' }}
                    />

                    <Text style={styles.sectionLabel}>PROFILE VISIBILITY</Text>

                    <PrivacyCard
                        type="link"
                        iconName="image-outline"
                        iconLib="ionicons"
                        iconColor="#F68537"
                        bgColor="#F6853710"
                        title="Profile Photo"
                        desc="Control who can see your picture"
                        onPress={() => router.push('/privacy-safety/profile-photo' as any)}
                    />

                    <PrivacyCard
                        type="link"
                        iconName="document-text-outline"
                        iconLib="ionicons"
                        iconColor="#EC4899"
                        bgColor="#EC489910"
                        title="About / Bio"
                        desc="Control who can see your about info"
                        onPress={() => router.push('/privacy-safety/about-privacy' as any)}
                    />

                    <Text style={styles.sectionLabel}>GENERAL PRIVACY SETTINGS</Text>

                    <PrivacyCard
                        type="switch"
                        iconName="location-outline"
                        iconLib="ionicons"
                        iconColor="#EF4444"
                        bgColor="#EF444410"
                        title="Find My Warrior"
                        desc="Send your device location and battery status to the server securely."
                        value={trackerEnabled}
                        onValueChange={handleToggleAttempt}
                        trackColors={{ false: '#E5E7EB', true: '#FEE2E2' }}
                        thumbColors={{ false: '#FFFFFF', true: '#EF4444' }}
                        extraContent={
                            <>
                                <Text style={{ fontSize: 12, color: '#F68537', marginTop: 8, fontWeight: 'bold' }}>
                                    To track your lost device, go to:
                                </Text>
                                <Text style={{ fontSize: 13, color: '#374151', marginTop: 2, fontWeight: '600' }}>
                                    🌐 www.chatwarriors.com
                                </Text>
                            </>
                        }
                    />

                    <PrivacyCard
                        type="switch"
                        iconName="mail-outline"
                        iconLib="ionicons"
                        iconColor="#F68537"
                        bgColor="#F6853710"
                        title="Show Email"
                        desc="Display your email address to your friends."
                        value={profile?.show_email ?? false}
                        onValueChange={(val) => updateProfile({ show_email: val })}
                    />

                    <PrivacyCard
                        type="switch"
                        iconName="call-outline"
                        iconLib="ionicons"
                        iconColor="#3B82F6"
                        bgColor="#3B82F610"
                        title="Show Phone Number"
                        desc="Display your phone number to your friends."
                        value={profile?.show_phone ?? false}
                        onValueChange={(val) => updateProfile({ show_phone: val })}
                        trackColors={{ false: '#E5E7EB', true: '#DBEAFE' }}
                        thumbColors={{ false: '#FFFFFF', true: '#3B82F6' }}
                    />

                    <PrivacyCard
                        type="switch"
                        iconName="radio-outline"
                        iconLib="ionicons"
                        iconColor="#10B981"
                        bgColor="#10B98110"
                        title="Show Online Status"
                        desc="Let others see when you are active on ChatWarriors."
                        value={profile?.is_online ?? true}
                        onValueChange={(val) => updateProfile({ is_online: val })}
                        trackColors={{ false: '#E5E7EB', true: '#D1FAE5' }}
                        thumbColors={{ false: '#FFFFFF', true: '#10B981' }}
                    />

                    <PrivacyCard
                        type="switch"
                        iconName="download-outline"
                        iconLib="ionicons"
                        iconColor="#F59E0B"
                        bgColor="#F59E0B10"
                        title="Allow Status Download"
                        desc="Allow your friends to download your status updates."
                        value={profile?.allow_status_download ?? false}
                        onValueChange={(val) => updateProfile({ allow_status_download: val })}
                        trackColors={{ false: '#E5E7EB', true: '#FEF3C7' }}
                        thumbColors={{ false: '#FFFFFF', true: '#F59E0B' }}
                    />

                    <PrivacyCard
                        type="switch"
                        iconName="scan-outline"
                        iconLib="ionicons"
                        iconColor="#8B5CF6"
                        bgColor="#8B5CF610"
                        title="Allow Screenshots"
                        desc="Let others take screenshots of your chat. We'll still notify you."
                        value={profile?.allow_screenshot ?? true}
                        onValueChange={(val) => updateProfile({ allow_screenshot: val })}
                        trackColors={{ false: '#E5E7EB', true: '#EDE9FE' }}
                        thumbColors={{ false: '#FFFFFF', true: '#8B5CF6' }}
                    />

                    <Text style={styles.sectionLabel}>GENERAL PRIVACY SETTINGS</Text>

                    <PrivacyCard
                        type="link"
                        iconName="eye-off-outline"
                        iconLib="ionicons"
                        iconColor="#FFF"
                        bgColor="#111827"
                        title="Ninja Vault (Ghost Chats)"
                        desc="Hide your most private conversations"
                        onPress={() => router.push('/privacy-safety/ninja-vault' as any)}
                    />

                    <PrivacyCard
                        type="link"
                        iconName="lock-reset"
                        iconLib="material"
                        iconColor="#F68537"
                        bgColor="#F6853710"
                        title="Change Password"
                        desc="Update your account password or reset it via email"
                        onPress={() => router.push('/change-password')}
                    />

                    <PrivacyCard
                        type="link"
                        iconName="account-cancel-outline"
                        iconLib="material"
                        iconColor="#EF4444"
                        bgColor="#EF444410"
                        title="Blocked Users"
                        desc="Manage users you have blocked from messaging you"
                        onPress={() => router.push('/blocked-users')}
                        badgeCount={blockedUserIds.length}
                    />

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>

            <PasswordVerificationModal
                visible={showPasswordModal}
                onClose={() => {
                    setShowPasswordModal(false);
                    setPendingToggleValue(null);
                }}
                passwordInput={passwordInput}
                setPasswordInput={setPasswordInput}
                isVerifying={isVerifying}
                onVerify={verifyPasswordAndToggle}
                pendingToggleValue={pendingToggleValue}
            />
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
        borderBottomColor: '#F3F4F6',
    },
    headerIcon: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
    heroSection: { alignItems: 'center', marginBottom: 32 },
    heroBadge: {
        width: 100, height: 100, borderRadius: 50,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 20, borderWidth: 1, borderColor: '#FFEEDD',
    },
    heroTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 },
    heroText: {
        fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20,
    },
    sectionLabel: {
        fontSize: 12, fontWeight: 'bold', color: '#9CA3AF', marginBottom: 20, marginTop: 10, letterSpacing: 1.5,
    }
});

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
