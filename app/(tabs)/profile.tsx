import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useFriends } from '@/hooks/useFriends';
import { useSentRequests } from '@/hooks/useSentRequests';
import { useReceivedRequests } from '@/hooks/useReceivedRequests';

// Extracted UI Components
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfileActions from '@/components/profile/ProfileActions';
import ProfileSettings from '@/components/profile/ProfileSettings';

export default function ProfileScreen() {
    const swipeHandlers = useSwipeNavigation();
    const user = useAuthStore(state => state.user);
    const profile = useAuthStore(state => state.profile);
    const signOut = useAuthStore(state => state.signOut);
    const syncProfile = useAuthStore(state => state.syncProfile);
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

                <ScrollView 
                    style={{ flex: 1 }} 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 60 }}
                >
                    <ProfileHeader 
                        avatarUrl={avatarUrl} 
                        fullName={fullName} 
                        bio={profile?.bio} 
                    />

                    <ProfileStats 
                        friendsCount={friends?.length || 0} 
                        sentCount={sentRequests?.length || 0} 
                        receivedCount={receivedRequests?.length || 0} 
                    />

                    <ProfileActions onShare={onShare} />

                    <ProfileSettings />

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

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
