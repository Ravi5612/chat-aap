import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useReceivedRequests } from '@/hooks/useReceivedRequests';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';

export default function NotificationsScreen() {
    const router = useRouter();
    const { receivedRequests, loading, loadRequests } = useReceivedRequests();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadRequests();
        setRefreshing(false);
    };

    const renderNotification = ({ item }: { item: any }) => {
        const isRequest = item.status === 'pending';
        
        return (
            <TouchableOpacity 
                style={styles.notificationItem}
                onPress={() => {
                    Haptics.selectionAsync();
                    if (isRequest) {
                        router.push('/friend-requests');
                    }
                }}
            >
                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: item.sender?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.sender?.username || 'User')}&backgroundColor=F68537` }}
                        style={styles.avatar}
                    />
                    <View style={styles.iconBadge}>
                        <Ionicons 
                            name={isRequest ? "person-add" : "notifications"} 
                            size={10} 
                            color="white" 
                        />
                    </View>
                </View>

                <View style={styles.content}>
                    <Text style={styles.message}>
                        <Text style={styles.username}>{item.sender?.username || 'Someone'}</Text>
                        {isRequest ? ' sent you a friend request.' : ' sent you a notification.'}
                    </Text>
                    <Text style={styles.time}>
                        {item.created_at ? format(new Date(item.created_at), 'MMM d, h:mm a') : 'Recently'}
                    </Text>
                </View>

                {isRequest && (
                    <View style={styles.unreadDot} />
                )}
            </TouchableOpacity>
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
                    <TouchableOpacity 
                        onPress={() => router.push('/notification-settings')}
                        style={styles.settingsButton}
                    >
                        <Ionicons name="settings-outline" size={24} color="#F68537" />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={receivedRequests}
                    keyExtractor={(item) => item.id}
                    renderItem={renderNotification}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F68537" />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconBg}>
                                <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
                            </View>
                            <Text style={styles.emptyTitle}>No Notifications Yet</Text>
                            <Text style={styles.emptySubtitle}>We'll notify you when something important happens.</Text>
                        </View>
                    }
                />
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
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    settingsButton: {
        padding: 8,
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    iconBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#F68537',
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    message: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
    },
    username: {
        fontWeight: 'bold',
        color: '#1F2937',
    },
    time: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 4,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F68537',
        marginLeft: 12,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        paddingHorizontal: 40,
    },
    emptyIconBg: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 20,
    }
});

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
