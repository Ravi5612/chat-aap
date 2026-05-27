import React, { useState, useCallback } from 'react';
import { View, FlatList, ActivityIndicator, RefreshControl, Alert, Text } from 'react-native';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// Hooks
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useCallLogs, CallLog } from '@/hooks/useCallLogs';

// Components
import CallsHeader from '@/components/calls/CallsHeader';
import CallLogItem from '@/components/calls/CallLogItem';
import CallListEmptyState from '@/components/calls/CallListEmptyState';
import DeleteCallLogsModal from '@/components/calls/DeleteCallLogsModal';

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

    const handleChatPress = useCallback((userId: string, userName: string, userImg?: string) => {
        if (isSelectionMode) return;
        router.push({
            pathname: `/chat/${userId}`,
            params: { name: userName, image: userImg }
        });
    }, [isSelectionMode, router]);

    const toggleSelection = useCallback((id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
            if (newSelected.size === 0) setIsSelectionMode(false);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    }, [selectedIds]);

    const handleLongPress = useCallback((id: string) => {
        if (!isSelectionMode) {
            setIsSelectionMode(true);
            const newSelected = new Set(selectedIds);
            newSelected.add(id);
            setSelectedIds(newSelected);
        }
    }, [isSelectionMode, selectedIds]);

    const handleDeleteSelected = useCallback(async () => {
        if (isDeleting || selectedIds.size === 0 || !currentUser?.id) return;
        setIsDeleting(true);
        
        const idsToDelete = Array.from(selectedIds);
        
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

    const renderFooter = () => {
        if (loadingMore) {
            return <ActivityIndicator size="small" color="#F68537" style={{ marginVertical: 20 }} />;
        }
        if (!hasMore && logs.length > 0) {
            return (
                <View style={{ alignItems: 'center', marginVertical: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F3F4F6', borderRadius: 9999, borderWidth: 1, borderColor: '#E5E7EB' }}>
                        <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
                            ✨ End of Call History
                        </Text>
                    </View>
                </View>
            );
        }
        return null;
    };

    const renderItem = useCallback(({ item }: { item: any }) => (
        <CallLogItem 
            item={item}
            currentUser={currentUser}
            isSelected={selectedIds.has(item.id)}
            isSelectionMode={isSelectionMode}
            onToggleSelection={toggleSelection}
            onLongPress={handleLongPress}
            onChatPress={handleChatPress}
        />
    ), [currentUser, selectedIds, isSelectionMode, toggleSelection, handleLongPress, handleChatPress]);

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }} {...swipeHandlers} collapsable={false}>
            <SafeAreaView style={{ flex: 1 }}>
                <CallsHeader 
                    isSelectionMode={isSelectionMode}
                    selectedCount={selectedIds.size}
                    onCancelSelection={cancelSelection}
                    onDeletePress={() => setIsDeleteModalVisible(true)}
                />

                {loading && !refreshing && logs.length === 0 ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#F68537" />
                    </View>
                ) : (
                    <FlatList
                        data={logs}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ flexGrow: 1 }}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F68537']} />
                        }
                        onEndReached={() => {
                            if (!loadingMore && hasMore) loadMoreLogs();
                        }}
                        onEndReachedThreshold={0.5}
                        ListEmptyComponent={<CallListEmptyState />}
                        ListFooterComponent={renderFooter}
                        initialNumToRender={15}
                        maxToRenderPerBatch={10}
                        windowSize={10}
                        removeClippedSubviews={true}
                        renderItem={renderItem}
                    />
                )}

                <DeleteCallLogsModal
                    visible={isDeleteModalVisible}
                    isDeleting={isDeleting}
                    selectedCount={selectedIds.size}
                    onCancel={() => setIsDeleteModalVisible(false)}
                    onDelete={handleDeleteSelected}
                />
            </SafeAreaView>
        </View>
    );
}

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
