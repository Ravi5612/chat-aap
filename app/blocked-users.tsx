import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { useFriendsStore } from '@/store/useFriendsStore';
import { useAuthStore } from '@/store/useAuthStore';
import * as Haptics from 'expo-haptics';

export default function BlockedUsersScreen() {
    const router = useRouter();
    const { user: currentUser } = useAuthStore();
    const { blockedUserIds, unblockUser } = useFriendsStore();
    const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchBlockedProfiles = async () => {
        if (!blockedUserIds || blockedUserIds.length === 0) {
            setBlockedUsers([]);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, email')
                .in('id', blockedUserIds);
            
            if (!error && data) {
                setBlockedUsers(data);
            }
        } catch (e) {
            console.error('Error fetching blocked profiles:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlockedProfiles();
    }, [blockedUserIds]);

    const handleUnblock = async (id: string, name: string) => {
        if (!currentUser) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await unblockUser(currentUser.id, id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#FFFDFB' }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
                        <Ionicons name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Blocked Users</Text>
                    <View style={{ width: 40 }} />
                </View>

                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#F68537" />
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={{ padding: 24 }}>
                        {blockedUsers.length > 0 ? (
                            <View style={styles.listContainer}>
                                {blockedUsers.map((user) => (
                                    <View key={user.id} style={styles.userRow}>
                                        <Image 
                                            source={{ uri: user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username || 'User')}&backgroundColor=F68537` }} 
                                            style={styles.avatar}
                                        />
                                        <View style={styles.info}>
                                            <Text style={styles.name}>{user.username || 'Unknown'}</Text>
                                            <Text style={styles.email}>{user.email || 'Email hidden'}</Text>
                                        </View>
                                        <TouchableOpacity 
                                            onPress={() => handleUnblock(user.id, user.username)}
                                            style={styles.unblockBtn}
                                        >
                                            <Text style={styles.unblockBtnText}>Unblock</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="shield-checkmark-outline" size={64} color="#E5E7EB" />
                                <Text style={styles.emptyText}>You haven't blocked anyone yet.</Text>
                                <Text style={styles.emptySubtext}>Blocked users will appear here and won't be able to message or call you.</Text>
                            </View>
                        )}
                    </ScrollView>
                )}
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
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        backgroundColor: 'white',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 5,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F3F4F6',
    },
    info: {
        flex: 1,
        marginLeft: 16,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#374151',
    },
    email: {
        fontSize: 13,
        color: '#9CA3AF',
        marginTop: 2,
    },
    unblockBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#FFF7ED',
        borderRadius: 12,
    },
    unblockBtnText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#F68537',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#374151',
        marginTop: 20,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 20,
    }
});

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
