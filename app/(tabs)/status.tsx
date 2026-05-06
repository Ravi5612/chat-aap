import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFriends } from '@/hooks/useFriends';
import { useStatusActions } from '@/hooks/useStatusActions';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import StatusBar from '@/components/chat/StatusBar';

// Memoized Status Item for performance
const StatusItem = React.memo(({ item, onPress }: { item: any, onPress: (item: any) => void }) => {
    const latestStatus = item.statuses?.[0] || {};
    
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
                    <Image
                        source={{ uri: item.img || `https://api.dicebear.com/7.x/initials/svg?seed=${item.name}` }}
                        style={styles.avatar}
                    />
                </View>
                <View style={styles.statusCountBadge}>
                    <Text style={styles.statusCountText}>{item.statusCount}</Text>
                </View>
            </View>

            <View style={{ marginLeft: 16, flex: 1 }}>
                <Text style={styles.friendName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.timeContainer}>
                    <Ionicons name="time-outline" size={12} color="#94A3B8" />
                    <Text style={styles.timeText}>Recently updated</Text>
                </View>
            </View>

            <View style={[
                styles.thumbnail,
                { backgroundColor: (latestStatus.background_color && latestStatus.media_type === 'text') ? latestStatus.background_color : '#FDBA74' }
            ]}>
                {latestStatus.media_type === 'text' ? (
                    <Text style={styles.thumbnailText}>{latestStatus.content?.substring(0, 2).toUpperCase()}</Text>
                ) : (
                    <Image
                        source={{ uri: latestStatus.media_url || item.img }}
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
    const { combinedItems, myStatuses, loading, loadFriends } = useFriends();
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setCurrentUser(data.user);
        });
    }, []);

    const {
        setShowAddStatus,
        handleViewUserStatus,
        handleViewMyStatus,
    } = useStatusActions(currentUser, loadFriends);

    const friendsWithStatus = useMemo(() => {
        return combinedItems.filter(item => item.statusCount > 0);
    }, [combinedItems]);

    const renderHeader = () => (
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
                friendsWithStatus={combinedItems.filter(i => !i.isGroup && i.statusCount > 0)}
                onAddClick={() => setShowAddStatus(true)}
                onViewStatus={handleViewUserStatus}
                onViewMyStatus={handleViewMyStatus}
            />

            <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
                <Text style={styles.sectionTitle}>Recent Updates</Text>
            </View>
        </>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
                <Ionicons name="images-outline" size={48} color="#64748B" />
            </View>
            <Text style={styles.emptyText}>No status updates found</Text>
        </View>
    );

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        if (!currentUser) return;
        setRefreshing(true);
        await loadFriends(currentUser.id, true); // Force refresh with loader
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
                    renderItem={({ item }) => (
                        <View style={{ paddingHorizontal: 20 }}>
                            <StatusItem item={item} onPress={handleViewUserStatus} />
                        </View>
                    )}
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
