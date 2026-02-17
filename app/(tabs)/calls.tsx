import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';

// Adjust import paths as needed based on your project structure
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useCallLogs, CallLog } from '@/hooks/useCallLogs';

// Simple date formatter
const simpleFormatDistance = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

export default function CallsScreen() {
    const swipeHandlers = useSwipeNavigation();
    const { logs, loading, loadingMore, hasMore, refreshLogs, loadMoreLogs, currentUser } = useCallLogs();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        // Assuming refreshLogs returns a promise. If not, we can just await a small timeout or modify the hook.
        // In the hook implementation, it calls loadLogs which is async but wrapper might not be.
        // Let's assume it works or just call it.
        await refreshLogs();
        setRefreshing(false);
    }, [refreshLogs]);

    const renderItem = ({ item }: { item: CallLog }) => {
        const isOutgoing = item.caller_id === currentUser?.id;
        const otherUser = isOutgoing ? item.receiver : item.caller;
        const displayName = otherUser?.username || 'Unknown User';
        const displayImg = otherUser?.avatar_url;

        // Determine icon and color based on call status
        let statusIconName: keyof typeof Ionicons.glyphMap = 'call';
        let statusColor = '#6B7280'; // gray

        if (item.status === 'missed') {
            statusIconName = 'close-circle';
            statusColor = '#EF4444'; // red
        } else if (isOutgoing) {
            statusIconName = 'arrow-up-circle';
            statusColor = '#3B82F6'; // blue
        } else {
            statusIconName = 'arrow-down-circle';
            statusColor = '#10B981'; // green
        }

        // Icon for call type (video vs audio)
        const typeIconName = item.call_type === 'video' ? 'videocam' : 'call';

        return (
            <TouchableOpacity
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    backgroundColor: 'white',
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6'
                }}
            >
                <View style={{ marginRight: 16 }}>
                    <Image
                        source={{ uri: displayImg || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random` }}
                        style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#E5E7EB' }}
                    />
                    <View style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        backgroundColor: 'white',
                        borderRadius: 10,
                        padding: 2
                    }}>
                        <Ionicons name={typeIconName} size={14} color="#F68537" />
                    </View>
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>{displayName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Ionicons name={statusIconName} size={14} color={statusColor} style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 13, color: '#6B7280' }}>
                            {item.status === 'missed' ? 'Missed' : isOutgoing ? 'Outgoing' : 'Incoming'} • {simpleFormatDistance(item.created_at)}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity style={{ padding: 8 }}>
                    <Ionicons name="information-circle-outline" size={24} color="#F68537" />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }} {...swipeHandlers} collapsable={false}>
            <SafeAreaView style={{ flex: 1 }}>
                <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#F68537' }}>Calls</Text>
                    <TouchableOpacity style={{ backgroundColor: '#FFF7ED', padding: 8, borderRadius: 9999 }}>
                        <Ionicons name="call-outline" size={24} color="#F68537" />
                    </TouchableOpacity>
                </View>

                {loading && !refreshing && logs.length === 0 ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#F68537" />
                    </View>
                ) : (
                    <FlatList
                        data={logs}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ flexGrow: 1 }}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F68537']} />
                        }
                        onEndReached={loadMoreLogs}
                        onEndReachedThreshold={0.5}
                        ListEmptyComponent={() => (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 50 }}>
                                <View style={{ backgroundColor: '#FFF7ED', padding: 40, borderRadius: 9999, marginBottom: 24 }}>
                                    <Ionicons name="call" size={80} color="#F68537" />
                                </View>
                                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1F2937' }}>No recent calls</Text>
                                <Text style={{ color: '#6B7280', textAlign: 'center', marginTop: 8 }}>
                                    Start a voice or video call with your friends to stay connected.
                                </Text>
                            </View>
                        )}
                        ListFooterComponent={() => {
                            if (loadingMore) {
                                return <ActivityIndicator size="small" color="#F68537" style={{ marginVertical: 20 }} />;
                            }
                            if (!hasMore && logs.length > 0) {
                                return (
                                    <View style={{ alignItems: 'center', marginVertical: 20 }}>
                                        <View style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingHorizontal: 16,
                                            paddingVertical: 8,
                                            backgroundColor: '#F3F4F6',
                                            borderRadius: 9999,
                                            borderWidth: 1,
                                            borderColor: '#E5E7EB'
                                        }}>
                                            <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
                                                ✨ End of Call History
                                            </Text>
                                        </View>
                                    </View>
                                );
                            }
                            return null;
                        }}
                    />
                )}
            </SafeAreaView>
        </View>
    );
}
