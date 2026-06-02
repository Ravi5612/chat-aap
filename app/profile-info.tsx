import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { Image } from 'expo-image';

export default function ProfileInfoScreen() {
    const router = useRouter();
    const profile = useAuthStore(state => state.profile);

    let avatarSource;
    if (profile?.avatar_url) {
        avatarSource = { uri: profile.avatar_url };
    } else if (profile?.gender === 'female') {
        avatarSource = require('@/assets/images/default-avatar-female.jpg');
    } else if (profile?.gender === 'other') {
        avatarSource = require('@/assets/images/default-avatar-other.png');
    } else {
        avatarSource = require('@/assets/images/default-avatar-male.jpg');
    }

    const InfoRow = ({ icon, label, value }: { icon: any, label: string, value: string | undefined | null }) => (
        <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
                <Ionicons name={icon} size={22} color="#F68537" />
            </View>
            <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value || 'Not set'}</Text>
            </View>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#FFF5E6' }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
                        <Ionicons name="arrow-back" size={28} color="#374151" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Profile Info</Text>
                    <TouchableOpacity onPress={() => router.push('/edit-profile')} style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                        <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
                    {/* Avatar Display */}
                    <View style={styles.avatarSection}>
                        <Image
                            source={avatarSource}
                            style={styles.avatar}
                        />
                        <Text style={styles.nameText}>{profile?.username || 'User'}</Text>
                    </View>

                    {/* Information Fields */}
                    <View style={styles.infoContainer}>
                        <InfoRow 
                            icon="person-outline" 
                            label="Display Name" 
                            value={profile?.username} 
                        />
                        
                        <InfoRow 
                            icon="call-outline" 
                            label="Phone Number" 
                            value={profile?.phone} 
                        />
                        
                        <InfoRow 
                            icon="mail-outline" 
                            label="Email Address" 
                            value={profile?.email} 
                        />

                        <InfoRow 
                            icon="male-female-outline" 
                            label="Gender" 
                            value={profile?.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : undefined} 
                        />

                        <View style={[styles.infoRow, { borderBottomWidth: 0, alignItems: 'flex-start' }]}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="information-circle-outline" size={22} color="#F68537" />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Bio / About Me</Text>
                                <Text style={[styles.infoValue, { marginTop: 4, lineHeight: 22 }]}>
                                    {profile?.bio || 'No bio set yet.'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'white'
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937'
    },
    editButtonText: {
        color: '#F68537',
        fontWeight: 'bold',
        fontSize: 16
    },
    avatarSection: {
        alignItems: 'center',
        paddingVertical: 40,
        backgroundColor: 'white',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2
    },
    avatar: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#F3F4F6',
        borderWidth: 4,
        borderColor: '#FFF'
    },
    nameText: {
        marginTop: 16,
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937'
    },
    infoContainer: {
        padding: 20,
        gap: 16,
        marginTop: 16
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF7ED',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16
    },
    infoContent: {
        flex: 1
    },
    infoLabel: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        marginBottom: 4
    },
    infoValue: {
        fontSize: 16,
        color: '#1F2937',
        fontWeight: '500'
    }
});

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
