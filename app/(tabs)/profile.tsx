import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useFriends } from '@/hooks/useFriends';
import { useSentRequests } from '@/hooks/useSentRequests';
import { useReceivedRequests } from '@/hooks/useReceivedRequests';

export default function ProfileScreen() {
    const swipeHandlers = useSwipeNavigation();
    const { user, profile, signOut, syncProfile } = useAuthStore();
    const { friends } = useFriends();
    const { sentRequests } = useSentRequests();
    const { receivedRequests } = useReceivedRequests();
    const router = useRouter();

    useEffect(() => {
        syncProfile();
    }, []);

    const handleLogout = async () => {
        Alert.alert('Logout', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: signOut }
        ]);
    };

    const onShare = async () => {
        try {
            await Share.share({
                message: `Connect with me on ChatWarriors! My profile: ${profile?.username}`,
            });
        } catch (error: any) {
            Alert.alert(error.message);
        }
    };

    const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
    const fullName = profile?.username || user?.user_metadata?.full_name || 'Chat Warrior';

    return (
        <View style={{ flex: 1, backgroundColor: '#FFFDFB' }} {...swipeHandlers} collapsable={false}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
                        <Ionicons name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{fullName}</Text>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Ionicons name="ellipsis-vertical" size={24} color="#374151" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    {/* Avatar & Info */}
                    <View style={styles.profileHeader}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatarOuterRing}>
                                <Image
                                    source={avatarUrl ? { uri: avatarUrl } : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}&backgroundColor=F68537`}
                                    style={styles.avatar}
                                    contentFit="cover"
                                    transition={500}
                                />
                            </View>
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark" size={12} color="white" />
                            </View>
                        </View>

                        <View style={{ alignItems: 'center', marginTop: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.name}>{fullName}</Text>
                                <Text style={{ fontSize: 22, marginLeft: 4 }}>🚩</Text>
                            </View>
                            <Text style={styles.occupation}>SADAIVA DHARMIK</Text>
                            <Text style={styles.bio}>
                                "{profile?.bio || 'Dedicated to the path of righteousness and cultural heritage.'}"
                            </Text>
                        </View>
                    </View>

                    {/* Stats Bar */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{friends?.length || 0}</Text>
                            <Text style={styles.statLabel}>FRIENDS</Text>
                        </View>
                        <TouchableOpacity style={styles.statBox} onPress={() => router.push('/sent-requests' as any)}>
                            <Text style={styles.statValue}>{sentRequests?.length || 0}</Text>
                            <Text style={styles.statLabel}>SENT</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.statBox} onPress={() => router.push('/friend-requests' as any)}>
                            <Text style={styles.statValue}>{receivedRequests?.length || 0}</Text>
                            <Text style={styles.statLabel}>RECEIVED</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Main Actions */}
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity
                            style={{ flex: 1 }}
                            onPress={() => router.push('/edit-profile')}
                        >
                            <LinearGradient
                                colors={['#F68537', '#FF9D5C']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.editButton}
                            >
                                <Text style={styles.editButtonText}>Edit Profile</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.shareButton} onPress={onShare}>
                            <Ionicons name="share-social-outline" size={24} color="#F68537" />
                        </TouchableOpacity>
                    </View>

                    {/* Account Settings */}
                    <View style={{ padding: 24 }}>
                        <Text style={styles.sectionTitle}>ACCOUNT SETTINGS</Text>

                        <TouchableOpacity onPress={() => router.push('/edit-profile')} style={styles.settingsItem}>
                            <View style={[styles.settingsIconBg, { backgroundColor: '#FFF7ED' }]}>
                                <Ionicons name="person-outline" size={20} color="#F68537" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingsTitle}>Profile Information</Text>
                                <Text style={styles.settingsSubtitle}>Update your personal details</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.settingsItem}>
                            <View style={[styles.settingsIconBg, { backgroundColor: '#FFF7ED' }]}>
                                <Ionicons name="notifications-outline" size={20} color="#F68537" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingsTitle}>Notifications</Text>
                                <Text style={styles.settingsSubtitle}>Manage alerts and activities</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => router.push('/privacy-safety')} style={styles.settingsItem}>
                            <View style={[styles.settingsIconBg, { backgroundColor: '#FFF7ED' }]}>
                                <Ionicons name="shield-checkmark-outline" size={20} color="#F68537" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingsTitle}>Privacy & Safety</Text>
                                <Text style={styles.settingsSubtitle}>Secure your account presence</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.settingsItem}>
                            <View style={[styles.settingsIconBg, { backgroundColor: '#FFF7ED' }]}>
                                <Ionicons name="help-circle-outline" size={20} color="#F68537" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingsTitle}>Help Center</Text>
                                <Text style={styles.settingsSubtitle}>FAQs and support contact</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                        </TouchableOpacity>
                    </View>

                    {/* Logout Button */}
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                        <View style={styles.logoutIconBg}>
                            <Ionicons name="power" size={20} color="#EF4444" />
                        </View>
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
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
    },
    headerIcon: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    profileHeader: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatarOuterRing: {
        padding: 4,
        borderRadius: 80,
        borderWidth: 2,
        borderColor: '#FFEEDD',
    },
    avatar: {
        width: 130,
        height: 130,
        borderRadius: 65,
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: '#F68537',
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 3,
        borderColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    occupation: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#F68537',
        marginTop: 4,
        letterSpacing: 1.2,
    },
    bio: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginHorizontal: 40,
        marginTop: 12,
        fontStyle: 'italic',
        lineHeight: 20,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        marginTop: 24,
    },
    statBox: {
        backgroundColor: '#FFF9F1',
        width: '30%',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFF1E0',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F68537',
    },
    statLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#A08D7D',
        marginTop: 4,
    },
    actionsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        marginTop: 24,
        gap: 12,
    },
    editButton: {
        height: 54,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    editButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    shareButton: {
        width: 54,
        height: 54,
        borderRadius: 12,
        backgroundColor: '#FFF9F1',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFF1E0',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#9CA3AF',
        marginBottom: 16,
        letterSpacing: 1,
    },
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    settingsIconBg: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    settingsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#374151',
    },
    settingsSubtitle: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginTop: 8,
    },
    logoutIconBg: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#EF4444',
    }
});

