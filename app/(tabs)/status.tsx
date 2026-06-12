import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFriends } from '@/hooks/useFriends';
import { useStatusActions } from '@/hooks/useStatusActions';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'expo-router';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';

// Components
import StatusBar from '@/components/chat/StatusBar';
import { StatusListItem } from '@/components/status/StatusListItem';
import { StatusListSkeleton } from '@/components/status/StatusListSkeleton';

export default function StatusScreen() {
    const router = useRouter();
    const swipeHandlers = useSwipeNavigation();
    const insets = useSafeAreaInsets();
    const { combinedItems = [], myStatuses = { active: [] }, statusInfo = {}, loading, loadFriends } = useFriends();
    
    // ✅ Use auth store instead of separate supabase.auth.getUser() call
    const currentUser = useAuthStore(state => state.user);

    const {
        setShowAddStatus,
        handleViewUserStatus,
        handleViewMyStatus,
    } = useStatusActions(currentUser, loadFriends);

    const friendsWithStatus = useMemo(() => {
        if (!currentUser) return [];
        return combinedItems
            .filter(item => item.id !== currentUser.id && item.statusCount > 0)
            .map(item => ({
                ...item,
                thumbnail: statusInfo[item.id]?.thumbnail,
                mediaType: statusInfo[item.id]?.mediaType,
                text: statusInfo[item.id]?.text,
                bgColor: statusInfo[item.id]?.bgColor,
                latestTimestamp: statusInfo[item.id]?.latestTimestamp,
            }))
            .sort((a, b) => {
                const timeA = a.latestTimestamp ? new Date(a.latestTimestamp).getTime() : 0;
                const timeB = b.latestTimestamp ? new Date(b.latestTimestamp).getTime() : 0;
                return timeB - timeA;
            });
    }, [combinedItems, statusInfo, currentUser]);

    const renderHeader = useCallback(() => {
        return (
            <>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Status</Text>
                        <Text style={styles.headerSubtitle}>Recent Updates</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color="#64748B" />
                    </TouchableOpacity>
                </View>

                {/* Horizontal Status Bar */}
                <StatusBar
                    myStatuses={myStatuses}
                    statusInfo={statusInfo}
                    friendsWithStatus={friendsWithStatus}
                    onAddClick={() => setShowAddStatus(true)}
                    onViewStatus={handleViewUserStatus}
                    onViewMyStatus={handleViewMyStatus}
                />

                <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
                    <Text style={styles.sectionTitle}>Recent Updates</Text>
                </View>
            </>
        );
    }, [myStatuses, statusInfo, friendsWithStatus, handleViewUserStatus, handleViewMyStatus]);

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
                <Ionicons name="images-outline" size={48} color="#64748B" />
            </View>
            <Text style={styles.emptyText}>No status updates found</Text>
        </View>
    );

    const renderItem = useCallback(({ item }: { item: any }) => (
        <View style={{ paddingHorizontal: 20 }}>
            <StatusListItem item={item} onPress={handleViewUserStatus} />
        </View>
    ), [handleViewUserStatus]);

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        if (!currentUser) return;
        setRefreshing(true);
        await loadFriends();
        setRefreshing(false);
    }, [currentUser, loadFriends]);

    if (loading && friendsWithStatus.length === 0) {
        return <StatusListSkeleton topInset={insets.top} />;
    }

    return (
        <View style={{ flex: 1 }} {...swipeHandlers} collapsable={false}>
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <FlashList
                    data={friendsWithStatus}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={renderEmpty}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F68537" />
                    }
                    contentContainerStyle={{ paddingBottom: 40 }}
                    estimatedItemSize={80}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#EBD8B7' },
    header: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#1E293B', letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
    closeBtn: { padding: 4 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginBottom: 16 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 60, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 32, marginTop: 10, marginHorizontal: 20 },
    emptyIconCircle: { marginBottom: 16 },
    emptyText: { color: '#64748B', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' },
});

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
