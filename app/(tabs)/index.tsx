import { View, RefreshControl, AppState, AppStateStatus } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useAuthStore } from '@/store/useAuthStore';
import { useFriendsStore } from '@/store/useFriendsStore';
import FriendListItem from '@/components/chat/FriendListItem';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useStatusActions } from '@/hooks/useStatusActions';
import { useNotifications } from '@/hooks/useNotifications';
import FilterTabs from '@/components/chat/FilterTabs';
import { useReceivedRequests } from '@/hooks/useReceivedRequests';
import { useSentRequests } from '@/hooks/useSentRequests';
import * as Haptics from 'expo-haptics';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useFriends } from '@/hooks/useFriends';
import { ComponentErrorBoundary } from '@/components/ui/ComponentErrorBoundary';

import HomeHeader from '@/components/home/HomeHeader';
import HomeSuggestions from '@/components/home/HomeSuggestions';
import EmptyChatState from '@/components/home/EmptyChatState';

const ImageZoomModal = React.lazy(() => import('@/components/home/ImageZoomModal'));
const SOSButton = React.lazy(() => import('@/components/home/SOSButton'));
const NinjaVaultHeader = React.lazy(() => import('@/components/home/NinjaVaultHeader'));
const FriendContextMenu = React.lazy(() => import('@/components/chat/FriendContextMenu'));
const ChatLockModal = React.lazy(() => import('@/components/chat/ChatLockModal'));

// Extracted Hooks
import { useHomeMenuActions } from '@/hooks/home/useHomeMenuActions';
import { useHomeFilters } from '@/hooks/home/useHomeFilters';
import { useChatLock } from '@/hooks/home/useChatLock';
import { useVaultAuth } from '@/hooks/home/useVaultAuth';
import { useHomeNavigation } from '@/hooks/home/useHomeNavigation';

function HomeScreen() {
    const swipeHandlers = useSwipeNavigation();
    const currentUser = useAuthStore(state => state.user);
    const profile = useAuthStore(state => state.profile);
    const { combinedItems, loading, loadFriends } = useFriends();
    const { receivedRequests } = useReceivedRequests();
    const { sentRequests } = useSentRequests();
    const { getCounts } = useNotifications();
    const isVaultOpen = useFriendsStore(state => state.isVaultOpen);
    const loadVaultPasscode = useFriendsStore(state => state.loadVaultPasscode);
    
    const [activeTab, setActiveTab] = useState('all');
    const [selectedFriendForMenu, setSelectedFriendForMenu] = useState<any>(null);
    const [menuVisible, setMenuVisible] = useState(false);
    const [selectedImageForZoom, setSelectedImageForZoom] = useState<string | null>(null);
    const [showContactSuggestions, setShowContactSuggestions] = useState(true);
    const [showNearbySuggestions, setShowNearbySuggestions] = useState(true);
    const [suggestionTab, setSuggestionTab] = useState<'contacts' | 'nearby'>('contacts');
    const [suggestionsExpanded, setSuggestionsExpanded] = useState(true);

    const toggleSuggestionsExpanded = useCallback(() => {
        setSuggestionsExpanded(prev => !prev);
    }, []);

    const {
        lockModalVisible,
        setLockModalVisible,
        lockModalMode,
        setPendingLockedFriend,
        requireLockSetup,
        requireLockVerify,
        openLockedChat,
        handleLockModalSuccess
    } = useChatLock();

    const { handleSelectFriend } = useHomeNavigation(openLockedChat);
    const { searchQuery, setSearchQuery, handleSearchChange } = useVaultAuth();

    const { handleMenuAction } = useHomeMenuActions({
        currentUser,
        onRequireLockSetup: requireLockSetup,
        onRequireLockVerify: requireLockVerify
    });

    const { filteredItems, tabCounts } = useHomeFilters(combinedItems, activeTab, searchQuery, isVaultOpen);
    const { handleViewUserStatus } = useStatusActions(currentUser, loadFriends);



    useEffect(() => {
        loadVaultPasscode();
    }, []);

    // Auto-lock vault when app goes to background
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'background' || nextAppState === 'inactive') {
                if (useFriendsStore.getState().isVaultOpen) {
                    useFriendsStore.getState().setVaultOpen(false);
                    setSearchQuery('');
                }
            }
        });

        return () => {
            subscription.remove();
        };
    }, [setSearchQuery]);

    const handleLongPress = useCallback((friend: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedFriendForMenu(friend);
        setMenuVisible(true);
    }, []);

    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = useCallback(async () => {
        if (!currentUser) return;
        setRefreshing(true);
        await loadFriends(currentUser.id, true);
        setRefreshing(false);
    }, [currentUser, loadFriends]);

    const pendingSentCount = useMemo(() => sentRequests.filter(r => r.status === 'pending').length, [sentRequests]);
    const pendingReceivedCount = useMemo(() => receivedRequests.filter(r => r.status === 'pending').length, [receivedRequests]);

    const handleImageClick = useCallback((friend: any) => {
        setSelectedImageForZoom(friend.img || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(friend.name)}&backgroundColor=F68537`);
    }, []);

    const renderItem = useCallback(({ item }: { item: any }) => (
        <FriendListItem
            friend={item}
            onClick={handleSelectFriend}
            onLongPress={handleLongPress}
            isOnline={item.isOnline}
            onViewUserStatus={handleViewUserStatus}
            onImageClick={handleImageClick}
            currentUserId={currentUser?.id}
        />
    ), [handleSelectFriend, handleLongPress, handleViewUserStatus, handleImageClick, currentUser?.id]);

    return (
        <View style={{ flex: 1 }} {...swipeHandlers} collapsable={false}>
            <View style={{ flex: 1, backgroundColor: '#EBD8B7' }}>
                <ComponentErrorBoundary fallbackName="HomeHeader">
                    <HomeHeader
                        profile={profile}
                        pendingSentCount={pendingSentCount}
                        pendingReceivedCount={pendingReceivedCount}
                        unreadNotificationsCount={getCounts?.unread ?? 0}
                    />
                </ComponentErrorBoundary>

                <ComponentErrorBoundary fallbackName="FlashList">
                    <FlashList
                        style={{ flex: 1 }}
                        data={filteredItems}
                        keyExtractor={(item) => {
                            const key = item.id?.toString() || item.email?.toString();
                            if (!key) console.warn('[FlatList] Missing unique ID for item:', item);
                            return key || Math.random().toString();
                        }}
                        contentContainerStyle={{ paddingBottom: 110 }}
                        ListHeaderComponent={
                            <View>
                                {isVaultOpen ? (
                                    <ComponentErrorBoundary fallbackName="NinjaVaultHeader">
                                        <React.Suspense fallback={<View style={{height: 60}} />}>
                                            <NinjaVaultHeader onClose={() => setSearchQuery('')} />
                                        </React.Suspense>
                                    </ComponentErrorBoundary>
                                ) : (
                                    <ComponentErrorBoundary fallbackName="FilterTabs">
                                        <FilterTabs
                                            activeTab={activeTab}
                                            onTabChange={setActiveTab}
                                            counts={tabCounts}
                                            onSearchChange={handleSearchChange}
                                        />
                                    </ComponentErrorBoundary>
                                )}
                                {!isVaultOpen && activeTab === 'all' && !searchQuery && (showContactSuggestions || showNearbySuggestions) && (
                                    <ComponentErrorBoundary fallbackName="HomeSuggestions">
                                        <HomeSuggestions
                                            showContactSuggestions={showContactSuggestions}
                                            showNearbySuggestions={showNearbySuggestions}
                                            suggestionTab={suggestionTab}
                                            suggestionsExpanded={suggestionsExpanded}
                                            onSetSuggestionTab={setSuggestionTab}
                                            onToggleExpanded={toggleSuggestionsExpanded}
                                        />
                                    </ComponentErrorBoundary>
                                )}
                            </View>
                        }
                        renderItem={renderItem}
                        ListEmptyComponent={
                            <ComponentErrorBoundary fallbackName="EmptyChatState">
                                <EmptyChatState loading={loading} searchQuery={searchQuery} />
                            </ComponentErrorBoundary>
                        }
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F68537" />}
                        estimatedItemSize={76}
                    />
                </ComponentErrorBoundary>

                <ComponentErrorBoundary fallbackName="FriendContextMenu">
                    <React.Suspense fallback={null}>
                        <FriendContextMenu
                            visible={menuVisible}
                            friend={selectedFriendForMenu}
                            onClose={() => setMenuVisible(false)}
                            onAction={handleMenuAction}
                        />
                    </React.Suspense>
                </ComponentErrorBoundary>

                <ComponentErrorBoundary fallbackName="ChatLockModal">
                    <React.Suspense fallback={null}>
                        <ChatLockModal
                            visible={lockModalVisible}
                            mode={lockModalMode}
                            onClose={() => {
                                setLockModalVisible(false);
                                setPendingLockedFriend(null);
                            }}
                            onSuccess={handleLockModalSuccess}
                        />
                    </React.Suspense>
                </ComponentErrorBoundary>

                <ComponentErrorBoundary fallbackName="ImageZoomModal">
                    <React.Suspense fallback={null}>
                        <ImageZoomModal
                            imageUrl={selectedImageForZoom}
                            onClose={() => setSelectedImageForZoom(null)}
                        />
                    </React.Suspense>
                </ComponentErrorBoundary>

                <ComponentErrorBoundary fallbackName="SOSButton">
                    <React.Suspense fallback={null}>
                        <SOSButton />
                    </React.Suspense>
                </ComponentErrorBoundary>
            </View>
        </View>
    );
}

export default HomeScreen;

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
