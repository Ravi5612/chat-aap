import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useReceivedRequests } from '@/hooks/useReceivedRequests';
import { useDbNotifications } from '@/hooks/useDbNotifications';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';

export default function NotificationsScreen() {
    const router = useRouter();
    const { receivedRequests, acceptRequest, rejectRequest } = useReceivedRequests();
    const { notifications, loading, unreadCount, markAllRead, refresh } = useDbNotifications();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
    };

    // Pending friend requests (not yet accepted/rejected)
    const pendingRequests = receivedRequests.filter(r => r.status === 'pending');

    const renderFriendRequest = ({ item }: { item: any }) => (
        <View style={styles.notificationItem}>
            <View style={styles.avatarContainer}>
                <Image
                    source={{ uri: item.sender?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.sender?.username || 'User')}&backgroundColor=F68537` }}
                    style={styles.avatar}
                />
                <View style={[styles.iconBadge, { backgroundColor: '#3B82F6' }]}>
                    <Ionicons name="person-add" size={10} color="white" />
                </View>
            </View>

            <View style={styles.content}>
                <Text style={styles.message}>
                    <Text style={styles.username}>{item.sender?.username || 'Someone'}</Text>
                    {' ne aapko friend request bheji!'}
                </Text>
                <Text style={styles.time}>
                    {item.created_at ? format(new Date(item.created_at), 'MMM d, h:mm a') : 'Recently'}
                </Text>
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            acceptRequest(item.id, item.sender_id);
                        }}
                    >
                        <Text style={styles.acceptBtnText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            rejectRequest(item.id);
                        }}
                    >
                        <Text style={styles.rejectBtnText}>Decline</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderNotification = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.notificationItem, !item.is_read && styles.unreadItem]}
            onPress={() => {
                Haptics.selectionAsync();
                if (item.type === 'friend_request') router.push('/friend-requests');
            }}
        >
            <View style={styles.avatarContainer}>
                <Image
                    source={{ uri: item.sender?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.sender?.username || 'User')}&backgroundColor=F68537` }}
                    style={styles.avatar}
                />
                <View style={styles.iconBadge}>
                    <Ionicons
                        name={item.type === 'friend_request' ? 'person-add' : item.type === 'friend_accepted' ? 'people' : 'notifications'}
                        size={10}
                        color="white"
                    />
                </View>
            </View>

            <View style={styles.content}>
                <Text style={styles.message}>{item.message || 'New notification'}</Text>
                <Text style={styles.time}>
                    {item.created_at ? format(new Date(item.created_at), 'MMM d, h:mm a') : 'Recently'}
                </Text>
            </View>

            {!item.is_read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
    );

    // Combine: pehle pending requests, phir notifications
    const combinedData: any[] = [
        ...pendingRequests.map(r => ({ ...r, _type: 'friend_request_pending' })),
        ...notifications.map(n => ({ ...n, _type: 'notification' }))
    ];

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}
                    </Text>
                    {unreadCount > 0 && (
                        <TouchableOpacity onPress={markAllRead} style={styles.settingsButton}>
                            <Text style={{ color: '#F68537', fontWeight: '600', fontSize: 13 }}>Mark all read</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <FlatList
                    data={combinedData}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) =>
                        item._type === 'friend_request_pending'
                            ? renderFriendRequest({ item })
                            : renderNotification({ item })
                    }
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
    container: { flex: 1, backgroundColor: '#FFFDFB' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
    settingsButton: { padding: 8 },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    unreadItem: { backgroundColor: '#FFF7ED' },
    avatarContainer: { position: 'relative', marginRight: 12 },
    avatar: { width: 48, height: 48, borderRadius: 24 },
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
    content: { flex: 1 },
    message: { fontSize: 14, color: '#374151', lineHeight: 20 },
    username: { fontWeight: 'bold', color: '#1F2937' },
    time: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F68537',
        marginLeft: 12,
        marginTop: 6,
    },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    acceptBtn: {
        backgroundColor: '#F68537',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    acceptBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
    rejectBtn: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    rejectBtnText: { color: '#6B7280', fontWeight: '600', fontSize: 13 },
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
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
});

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
