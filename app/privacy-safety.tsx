import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFriendsStore } from '@/store/useFriendsStore';
import { useAuthStore } from '@/store/useAuthStore';
import React, { useEffect, useState } from 'react';
import { AppStorage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';

export default function PrivacySafetyScreen() {
    const router = useRouter();
    const { profile, updateProfile, user } = useAuthStore();
    const { blockedUserIds } = useFriendsStore();
    const [trackerEnabled, setTrackerEnabled] = useState(false);
    
    // Password Modal State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [pendingToggleValue, setPendingToggleValue] = useState<boolean | null>(null);

    useEffect(() => {
        const loadTrackerState = async () => {
            const state = await AppStorage.getItemAsync('tracker_enabled');
            setTrackerEnabled(state === 'true');
        };
        loadTrackerState();
    }, []);

    const handleToggleAttempt = (newValue: boolean) => {
        setPendingToggleValue(newValue);
        setPasswordInput('');
        setShowPasswordModal(true);
    };

    const verifyPasswordAndToggle = async () => {
        if (!passwordInput.trim() || !user?.email || pendingToggleValue === null) return;
        
        setIsVerifying(true);
        try {
            // Verify password by attempting to sign in
            const { error } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: passwordInput
            });

            if (error) {
                alert('Incorrect password. Please try again.');
                setIsVerifying(false);
                return;
            }

            // Password correct! Proceed with toggle
            const newValue = pendingToggleValue;
            setTrackerEnabled(newValue);
            await AppStorage.setItemAsync('tracker_enabled', newValue ? 'true' : 'false');
            
            const deviceId = await AppStorage.getItemAsync('unique_device_id');
            if (deviceId) {
                await supabase.from('user_devices').update({ is_tracker_enabled: newValue }).eq('user_id', user.id).eq('device_id', deviceId);
            }
            
            setShowPasswordModal(false);
        } catch (err) {
            alert('Something went wrong verifying your password.');
        } finally {
            setIsVerifying(false);
        }
    };

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

                    {/* Become a Warrior */}
                    <View style={styles.tipCard}>
                        <View style={[styles.iconContainer, { backgroundColor: '#F6853710' }]}>
                            <MaterialCommunityIcons name="shield-sword" size={26} color="#F68537" />
                        </View>
                        <View style={styles.tipContent}>
                            <Text style={styles.tipTitle}>Become a Warrior 🛡️</Text>
                            <Text style={styles.tipDesc}>Opt-in to receive SOS alerts from users in danger within 5KM.</Text>
                            {(profile?.missions_completed || 0) > 0 && (
                                <Text style={{ fontSize: 12, color: '#10B981', marginTop: 4, fontWeight: 'bold' }}>
                                    🎖️ Missions Completed: {profile?.missions_completed}
                                </Text>
                            )}
                        </View>
                        <Switch 
                            value={profile?.is_warrior ?? false}
                            onValueChange={async (newValue) => {
                                await updateProfile({ is_warrior: newValue });
                            }}
                            trackColor={{ false: '#E5E7EB', true: '#FFEDD5' }}
                            thumbColor={profile?.is_warrior ? '#F68537' : '#FFFFFF'}
                            style={{ alignSelf: 'center' }}
                        />
                    </View>

                    <Text style={styles.sectionLabel}>DISCOVERY & NOTIFICATIONS</Text>

                    <View style={styles.tipCard}>
                        <View style={[styles.iconContainer, { backgroundColor: '#10B98110' }]}>
                            <MaterialCommunityIcons name="radar" size={26} color="#10B981" />
                        </View>
                        <View style={styles.tipContent}>
                            <Text style={styles.tipTitle}>Nearby Discovery</Text>
                            <Text style={styles.tipDesc}>Get notified when other warriors are within 1KM of you.</Text>
                        </View>
                        <Switch 
                            value={profile?.nearby_notifications_enabled ?? false}
                            onValueChange={async (newValue) => {
                                await updateProfile({ nearby_notifications_enabled: newValue });
                            }}
                            trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }}
                            thumbColor={profile?.nearby_notifications_enabled ? '#10B981' : '#FFFFFF'}
                            style={{ alignSelf: 'center' }}
                        />
                    </View>

                    <Text style={styles.sectionLabel}>PROFILE VISIBILITY</Text>

                    <TouchableOpacity 
                        onPress={() => router.push('/privacy-safety/profile-photo' as any)}
                        style={styles.tipCard}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: '#F6853710' }]}>
                            <Ionicons name="image-outline" size={26} color="#F68537" />
                        </View>
                        <View style={styles.tipContent}>
                            <Text style={styles.tipTitle}>Profile Photo</Text>
                            <Text style={styles.tipDesc}>Control who can see your picture</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" style={{ alignSelf: 'center' }} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={() => router.push('/privacy-safety/about-privacy' as any)}
                        style={styles.tipCard}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: '#EC489910' }]}>
                            <Ionicons name="document-text-outline" size={26} color="#EC4899" />
                        </View>
                        <View style={styles.tipContent}>
                            <Text style={styles.tipTitle}>About / Bio</Text>
                            <Text style={styles.tipDesc}>Control who can see your about info</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" style={{ alignSelf: 'center' }} />
                    </TouchableOpacity>

                    <Text style={styles.sectionLabel}>GENERAL PRIVACY SETTINGS</Text>

                    {/* Find My Warrior */}
                    <View style={styles.tipCard}>
                        <View style={[styles.iconContainer, { backgroundColor: '#EF444410' }]}>
                            <Ionicons name="location-outline" size={26} color="#EF4444" />
                        </View>
                        <View style={styles.tipContent}>
                            <Text style={styles.tipTitle}>Find My Warrior</Text>
                            <Text style={styles.tipDesc}>Send your device location and battery status to the server securely.</Text>
                            <Text style={{ fontSize: 12, color: '#F68537', marginTop: 8, fontWeight: 'bold' }}>
                                To track your lost device, go to:
                            </Text>
                            <Text style={{ fontSize: 13, color: '#374151', marginTop: 2, fontWeight: '600' }}>
                                🌐 www.chatwarriors.com
                            </Text>
                        </View>
                        <Switch 
                            value={trackerEnabled}
                            onValueChange={handleToggleAttempt}
                            trackColor={{ false: '#E5E7EB', true: '#FEE2E2' }}
                            thumbColor={trackerEnabled ? '#EF4444' : '#FFFFFF'}
                            style={{ alignSelf: 'center' }}
                        />
                    </View>

                    {/* Show Email */}
                    <View style={styles.tipCard}>
                        <View style={[styles.iconContainer, { backgroundColor: '#F6853710' }]}>
                            <Ionicons name="mail-outline" size={26} color="#F68537" />
                        </View>
                        <View style={styles.tipContent}>
                            <Text style={styles.tipTitle}>Show Email</Text>
                            <Text style={styles.tipDesc}>Display your email address to your friends.</Text>
                        </View>
                        <Switch 
                            value={profile?.show_email ?? false}
                            onValueChange={async (newValue) => {
                                await updateProfile({ show_email: newValue });
                            }}
                            trackColor={{ false: '#E5E7EB', true: '#FFEDD5' }}
                            thumbColor={profile?.show_email ? '#F68537' : '#FFFFFF'}
                            style={{ alignSelf: 'center' }}
                        />
                    </View>
                    
                    {/* Show Phone */}
                    <View style={styles.tipCard}>
                        <View style={[styles.iconContainer, { backgroundColor: '#3B82F610' }]}>
                            <Ionicons name="call-outline" size={26} color="#3B82F6" />
                        </View>
                        <View style={styles.tipContent}>
                            <Text style={styles.tipTitle}>Show Phone Number</Text>
                            <Text style={styles.tipDesc}>Display your phone number to your friends.</Text>
                        </View>
                        <Switch 
                            value={profile?.show_phone ?? false}
                            onValueChange={async (newValue) => {
                                await updateProfile({ show_phone: newValue });
                            }}
                            trackColor={{ false: '#E5E7EB', true: '#DBEAFE' }}
                            thumbColor={profile?.show_phone ? '#3B82F6' : '#FFFFFF'}
                            style={{ alignSelf: 'center' }}
                        />
                    </View>



                    {/* Show Online Status */}
                    <View style={styles.tipCard}>
                        <View style={[styles.iconContainer, { backgroundColor: '#10B98110' }]}>
                            <Ionicons name="radio-outline" size={26} color="#10B981" />
                        </View>
                        <View style={styles.tipContent}>
                            <Text style={styles.tipTitle}>Show Online Status</Text>
                            <Text style={styles.tipDesc}>Let others see when you are active on ChatWarriors.</Text>
                        </View>
                        <Switch 
                            value={profile?.is_online ?? true}
                            onValueChange={async (newValue) => {
                                await updateProfile({ is_online: newValue });
                            }}
                            trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }}
                            thumbColor={profile?.is_online ? '#10B981' : '#FFFFFF'}
                            style={{ alignSelf: 'center' }}
                        />
                    </View>

                    {/* Allow Status Download */}
                    <View style={styles.tipCard}>
                        <View style={[styles.iconContainer, { backgroundColor: '#F59E0B10' }]}>
                            <Ionicons name="download-outline" size={26} color="#F59E0B" />
                        </View>
                        <View style={styles.tipContent}>
                            <Text style={styles.tipTitle}>Allow Status Download</Text>
                            <Text style={styles.tipDesc}>Allow your friends to download your status updates.</Text>
                        </View>
                        <Switch 
                            value={profile?.allow_status_download ?? false}
                            onValueChange={async (newValue) => {
                                await updateProfile({ allow_status_download: newValue });
                            }}
                            trackColor={{ false: '#E5E7EB', true: '#FEF3C7' }}
                            thumbColor={profile?.allow_status_download ? '#F59E0B' : '#FFFFFF'}
                            style={{ alignSelf: 'center' }}
                        />
                    </View>

                    <View style={styles.tipCard}>
                        <View style={[styles.iconContainer, { backgroundColor: '#8B5CF610' }]}>
                            <Ionicons name="scan-outline" size={26} color="#8B5CF6" />
                        </View>
                        <View style={styles.tipContent}>
                            <Text style={styles.tipTitle}>Allow Screenshots</Text>
                            <Text style={styles.tipDesc}>Let others take screenshots of your chat. We'll still notify you.</Text>
                        </View>
                        <Switch 
                            value={profile?.allow_screenshot ?? true}
                            onValueChange={async (newValue) => {
                                await updateProfile({ allow_screenshot: newValue });
                            }}
                            trackColor={{ false: '#E5E7EB', true: '#EDE9FE' }}
                            thumbColor={profile?.allow_screenshot ? '#8B5CF6' : '#FFFFFF'}
                            style={{ alignSelf: 'center' }}
                        />
                    </View>

                    <Text style={styles.sectionLabel}>GENERAL PRIVACY SETTINGS</Text>

                    <TouchableOpacity 
                        onPress={() => router.push('/privacy-safety/ninja-vault' as any)}
                        style={styles.tipCard}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: '#111827' }]}>
                            <Ionicons name="eye-off-outline" size={26} color="#FFF" />
                        </View>
                        <View style={styles.tipContent}>
                            <Text style={styles.tipTitle}>Ninja Vault (Ghost Chats)</Text>
                            <Text style={styles.tipDesc}>Hide your most private conversations</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" style={{ alignSelf: 'center' }} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={() => router.push('/change-password')}
                        style={styles.tipCard}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: '#F6853710' }]}>
                            <MaterialCommunityIcons name="lock-reset" size={26} color="#F68537" />
                        </View>
                        <View style={styles.tipContent}>
                            <Text style={styles.tipTitle}>Change Password</Text>
                            <Text style={styles.tipDesc}>Update your account password or reset it via email</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" style={{ alignSelf: 'center' }} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={() => router.push('/blocked-users')}
                        style={styles.tipCard}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: '#EF444410' }]}>
                            <MaterialCommunityIcons name="account-cancel-outline" size={26} color="#EF4444" />
                        </View>
                        <View style={styles.tipContent}>
                            <Text style={styles.tipTitle}>Blocked Users</Text>
                            <Text style={styles.tipDesc}>Manage users you have blocked from messaging you</Text>
                        </View>
                        <View style={styles.badgeContainer}>
                            <Text style={styles.badgeText}>{blockedUserIds.length}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" style={{ alignSelf: 'center', marginLeft: 8 }} />
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>

            {/* Password Verification Modal */}
            <Modal
                visible={showPasswordModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPasswordModal(false)}
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
                                onPress={() => {
                                    setShowPasswordModal(false);
                                    setPendingToggleValue(null);
                                }}
                                disabled={isVerifying}
                            >
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#4B5563' }}>Cancel</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={{ flex: 1, padding: 16, borderRadius: 16, backgroundColor: '#F68537', alignItems: 'center', opacity: (!passwordInput || isVerifying) ? 0.7 : 1 }}
                                onPress={verifyPasswordAndToggle}
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
    headerIcon: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    heroBadge: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FFEEDD',
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 12,
    },
    heroText: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#9CA3AF',
        marginBottom: 20,
        marginTop: 10,
        letterSpacing: 1.5,
    },
    tipCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    tipContent: {
        flex: 1,
    },
    tipTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 4,
    },
    tipDesc: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    blockButton: {
        marginTop: 20,
        backgroundColor: '#F3F4F6',
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
    },
    blockButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4B5563',
    },
    badgeContainer: {
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        alignSelf: 'center',
    },
    badgeText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
    }
});

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
