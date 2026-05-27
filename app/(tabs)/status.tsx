import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFriends } from '@/hooks/useFriends';
import { useStatusActions } from '@/hooks/useStatusActions';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'expo-router';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import StatusBar from '@/components/chat/StatusBar';

const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Recently updated';
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

// Memoized Status Item for performance
const StatusItem = React.memo(({ item, onPress }: { item: any, onPress: (item: any) => void }) => {
    // Single Video thumbnail rendered once for both avatar and thumbnail areas
    const videoThumbnail = item.mediaType === 'video' ? (
        <View style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
            {item.thumbnail ? (
                <>
                    <Image source={{ uri: item.thumbnail }} style={{ width: '100%', height: '100%', position: 'absolute' }} />
                    <View style={{ position: 'absolute', backgroundColor: 'rgba(0,0,0,0.3)', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="play" size={14} color="white" />
                    </View>
                </>
            ) : (
                <Ionicons name="videocam" size={24} color="white" />
            )}
        </View>
    ) : null;

    return (
        <TouchableOpacity
            onPress={() => onPress(item)}
            activeOpacity={0.7}
            style={styles.statusItem}
        >
            <View style={{ position: 'relative' }}>
                <View style={[
                    styles.avatarRing,
                    { borderColor: item.allStatusesViewed ? '#E2E8F0' : '#F68537' }
                ]}>
                    {item.mediaType === 'text' ? (
                        <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: item.bgColor || '#F68537', borderRadius: 30, padding: 4 }}>
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 9, textAlign: 'center' }} numberOfLines={3}>
                                {item.text || 'T'}
                            </Text>
                        </View>
                    ) : item.mediaType === 'video' ? (
                        <View style={{ width: '100%', height: '100%', borderRadius: 30, overflow: 'hidden', position: 'relative' }}>
                            {videoThumbnail}
                        </View>
                    ) : (
                        <Image
                            source={{ uri: item.thumbnail || item.img || `https://api.dicebear.com/7.x/initials/svg?seed=${item.name}` }}
                            style={styles.avatar}
                        />
                    )}
                </View>
                <View style={styles.statusCountBadge}>
                    <Text style={styles.statusCountText}>{item.statusCount}</Text>
                </View>
            </View>

            <View style={{ marginLeft: 16, flex: 1 }}>
                <Text style={styles.friendName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.timeContainer}>
                    <Ionicons name="time-outline" size={12} color="#94A3B8" />
                    <Text style={styles.timeText}>{formatRelativeTime(item.latestTimestamp)}</Text>
                </View>
            </View>

            <View style={[
                styles.thumbnail,
                { backgroundColor: item.mediaType === 'text' ? (item.bgColor || '#F68537') : '#FDBA74' }
            ]}>
                {item.mediaType === 'text' ? (
                    <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', padding: 4 }}>
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 8, textAlign: 'center' }} numberOfLines={3}>
                            {item.text || 'TEXT'}
                        </Text>
                    </View>
                ) : item.mediaType === 'video' ? (
                    videoThumbnail
                ) : (
                    <Image
                        source={{ uri: item.thumbnail || item.img }}
                        style={{ width: '100%', height: '100%' }}
                    />
                )}
            </View>
        </TouchableOpacity>
    );
});

export default function StatusScreen() {
    const router = useRouter();
    const swipeHandlers = useSwipeNavigation();
    const insets = useSafeAreaInsets();
    const { combinedItems = [], myStatuses = { active: [] }, statusInfo = {}, loading, loadFriends } = useFriends();
    // ✅ Use auth store instead of separate supabase.auth.getUser() call
    const { user: currentUser } = useAuthStore();

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
            }));
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
            <StatusItem item={item} onPress={handleViewUserStatus} />
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
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.skeletonHeader}>
                    <View style={styles.skeletonTitle} />
                    <View style={styles.skeletonSubTitle} />
                </View>
                <View style={{ paddingHorizontal: 20 }}>
                    <View style={styles.skeletonMyStatus} />
                    {[1, 2, 3].map((i) => (
                        <View key={i} style={styles.skeletonItem} />
                    ))}
                </View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }} {...swipeHandlers} collapsable={false}>
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <FlatList
                    data={friendsWithStatus}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={renderEmpty}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F68537" />
                    }
                    contentContainerStyle={{ paddingBottom: 40 }}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={true}
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
    statusItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 14, borderRadius: 24, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1 },
    avatarRing: { width: 60, height: 60, borderRadius: 30, padding: 2, borderWidth: 2 },
    avatar: { width: '100%', height: '100%', borderRadius: 30 },
    statusCountBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#F68537', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
    statusCountText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    friendName: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
    timeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
    timeText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
    thumbnail: { width: 50, height: 50, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    thumbnailText: { color: 'white', fontWeight: '900', fontSize: 10 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 60, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 32, marginTop: 10, marginHorizontal: 20 },
    emptyIconCircle: { marginBottom: 16 },
    emptyText: { color: '#64748B', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' },
    skeletonHeader: { paddingHorizontal: 20, paddingVertical: 12 },
    skeletonTitle: { width: 100, height: 28, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 8, marginBottom: 4 },
    skeletonSubTitle: { width: 80, height: 12, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4 },
    skeletonMyStatus: { height: 120, backgroundColor: 'white', borderRadius: 24, marginBottom: 20, marginTop: 10, opacity: 0.6 },
    skeletonItem: { height: 80, backgroundColor: 'white', borderRadius: 24, marginBottom: 12, opacity: 0.6 }
});

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
