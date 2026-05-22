import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

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

// Simple duration formatter
const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
};

export default function CallsScreen() {
    const swipeHandlers = useSwipeNavigation();
    const router = useRouter();
    const { logs, loading, loadingMore, hasMore, refreshLogs, loadMoreLogs, currentUser } = useCallLogs();
    const [refreshing, setRefreshing] = useState(false);

    // Multi-selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshLogs();
        setRefreshing(false);
    }, [refreshLogs]);

    const handleChatPress = (userId: string, userName: string, userImg?: string) => {
        if (isSelectionMode) return;
        router.push({
            pathname: `/chat/${userId}`,
            params: { name: userName, image: userImg }
        });
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
            if (newSelected.size === 0) setIsSelectionMode(false);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleLongPress = (id: string) => {
        if (!isSelectionMode) {
            setIsSelectionMode(true);
            const newSelected = new Set(selectedIds);
            newSelected.add(id);
            setSelectedIds(newSelected);
        }
    };

    const handleDeleteSelected = useCallback(async () => {
        if (isDeleting || selectedIds.size === 0 || !currentUser?.id) return;
        setIsDeleting(true);
        
        const idsToDelete = Array.from(selectedIds);
        
        // SECURITY: Ensure we only delete logs that belong to the current user
        // (Fallback protection in case RLS is misconfigured)
        const { error } = await supabase.from('call_logs')
            .delete()
            .in('id', idsToDelete)
            .or(`caller_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);
            
        if (!error) {
            refreshLogs();
            setSelectedIds(new Set());
            setIsSelectionMode(false);
            setIsDeleteModalVisible(false);
        } else {
            Alert.alert("Error", "Failed to delete logs");
            setIsDeleteModalVisible(false);
        }
        setIsDeleting(false);
    }, [selectedIds, isDeleting, currentUser?.id, refreshLogs]);

    const cancelSelection = () => {
        setIsSelectionMode(false);
        setSelectedIds(new Set());
    };

    const renderItem = ({ item }: { item: CallLog }) => {
        const isOutgoing = item.caller_id === currentUser?.id;
        const otherUser = isOutgoing ? item.receiver : item.caller;
        const displayName = otherUser?.username || 'Unknown User';
        const displayImg = otherUser?.avatar_url;
        const isSelected = selectedIds.has(item.id);

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

        const typeIconName = item.call_type === 'video' ? 'videocam' : 'call';
        const durationStr = item.status !== 'missed' && item.duration > 0 ? ` (${formatDuration(item.duration)})` : '';

        return (
            <TouchableOpacity
                onPress={() => isSelectionMode ? toggleSelection(item.id) : otherUser && handleChatPress(otherUser.id, displayName, displayImg)}
                onLongPress={() => handleLongPress(item.id)}
                delayLongPress={400}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    backgroundColor: isSelected ? '#FFF7ED' : 'white',
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6'
                }}
            >
                {isSelectionMode && (
                    <View style={{ marginRight: 12 }}>
                        <Ionicons 
                            name={isSelected ? "checkbox" : "square-outline"} 
                            size={24} 
                            color={isSelected ? "#F68537" : "#D1D5DB"} 
                        />
                    </View>
                )}
                
                <View style={{ marginRight: 16 }}>
                    {displayImg ? (
                        <Image
                            source={{ uri: displayImg }}
                            style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#E5E7EB' }}
                        />
                    ) : (
                        <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="person" size={24} color="#9CA3AF" />
                        </View>
                    )}
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
                            {item.status === 'missed' ? 'Missed' : isOutgoing ? 'Outgoing' : 'Incoming'}{durationStr} • {simpleFormatDistance(item.created_at)}
                        </Text>
                    </View>
                </View>

                {!isSelectionMode && (
                    <TouchableOpacity 
                        onPress={() => otherUser && handleChatPress(otherUser.id, displayName, displayImg)}
                        style={{ padding: 8 }}
                    >
                        <Ionicons name="chatbubble-ellipses-outline" size={24} color="#F68537" />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }} {...swipeHandlers} collapsable={false}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* Custom Header */}
                <View style={{ 
                    padding: 16, 
                    borderBottomWidth: 1, 
                    borderBottomColor: '#F3F4F6', 
                    flexDirection: 'row', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    backgroundColor: isSelectionMode ? '#F68537' : 'white'
                }}>
                    {isSelectionMode ? (
                        <>
                            <TouchableOpacity onPress={cancelSelection}>
                                <Ionicons name="close" size={28} color="white" />
                            </TouchableOpacity>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>{selectedIds.size} Selected</Text>
                            <TouchableOpacity onPress={() => setIsDeleteModalVisible(true)}>
                                <Ionicons name="trash-outline" size={24} color="white" />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#F68537' }}>Calls</Text>
                            <TouchableOpacity style={{ backgroundColor: '#FFF7ED', padding: 8, borderRadius: 9999 }}>
                                <Ionicons name="call-outline" size={24} color="#F68537" />
                            </TouchableOpacity>
                        </>
                    )}
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
                        onEndReached={() => {
                            if (!loadingMore && hasMore) {
                                loadMoreLogs();
                            }
                        }}
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

                {/* Premium Delete Modal */}
                <Modal
                    visible={isDeleteModalVisible}
                    transparent={true}
                    animationType="fade"
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="trash" size={40} color="#EF4444" />
                            </View>
                            <Text style={styles.modalTitle}>Delete Call Logs?</Text>
                            <Text style={styles.modalMessage}>
                                Are you sure you want to delete {selectedIds.size} selected call log record{selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.
                            </Text>
                            
                            <View style={styles.modalButtons}>
                                <TouchableOpacity 
                                    style={[styles.modalButton, styles.cancelButton]} 
                                    onPress={() => setIsDeleteModalVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.modalButton, styles.deleteButton, isDeleting && { opacity: 0.7 }]} 
                                    onPress={handleDeleteSelected}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text style={styles.deleteButtonText}>Delete</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    modalContainer: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8
    },
    modalMessage: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%'
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center'
    },
    cancelButton: {
        backgroundColor: '#F3F4F6'
    },
    cancelButtonText: {
        color: '#4B5563',
        fontWeight: '600',
        fontSize: 16
    },
    deleteButton: {
        backgroundColor: '#EF4444'
    },
    deleteButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    }
});

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
