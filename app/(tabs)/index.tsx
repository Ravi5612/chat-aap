import { View, FlatList, Text, RefreshControl, Alert, Keyboard, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFriends } from '@/hooks/useFriends';
import { useAuthStore } from '@/store/useAuthStore';
import { useFriendsStore } from '@/store/useFriendsStore';
import FriendListItem from '@/components/chat/FriendListItem';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useStatusActions } from '@/hooks/useStatusActions';
import { useNotifications } from '@/hooks/useNotifications';
import FilterTabs from '@/components/chat/FilterTabs';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import FriendContextMenu from '@/components/chat/FriendContextMenu';
import { useReceivedRequests } from '@/hooks/useReceivedRequests';
import { useSentRequests } from '@/hooks/useSentRequests';
import * as Haptics from 'expo-haptics';
import ChatLockModal from '@/components/chat/ChatLockModal';

// Extracted UI Components
import HomeHeader from '@/components/home/HomeHeader';
import HomeSkeleton from '@/components/home/HomeSkeleton';
import ImageZoomModal from '@/components/home/ImageZoomModal';
import HomeSuggestions from '@/components/home/HomeSuggestions';

// Extracted Hooks
import { useHomeMenuActions } from '@/hooks/home/useHomeMenuActions';
import { useHomeFilters } from '@/hooks/home/useHomeFilters';
import { useChatLock } from '@/hooks/home/useChatLock';

function HomeScreen() {
    const router = useRouter();
    const swipeHandlers = useSwipeNavigation();
    const currentUser = useAuthStore(state => state.user);
    const profile = useAuthStore(state => state.profile);
    const { combinedItems, loading, loadFriends } = useFriends();
    const { receivedRequests } = useReceivedRequests();
    const { sentRequests } = useSentRequests();
    const { getCounts } = useNotifications();
    const isVaultOpen = useFriendsStore(state => state.isVaultOpen);
    const vaultPasscode = useFriendsStore(state => state.vaultPasscode);
    const setVaultOpen = useFriendsStore(state => state.setVaultOpen);
    const loadVaultPasscode = useFriendsStore(state => state.loadVaultPasscode);
    
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFriendForMenu, setSelectedFriendForMenu] = useState<any>(null);
    const [menuVisible, setMenuVisible] = useState(false);
    const [selectedImageForZoom, setSelectedImageForZoom] = useState<string | null>(null);
    const [showContactSuggestions, setShowContactSuggestions] = useState(true);
    const [showNearbySuggestions, setShowNearbySuggestions] = useState(true);
    const [suggestionTab, setSuggestionTab] = useState<'contacts' | 'nearby'>('contacts');
    const [suggestionsExpanded, setSuggestionsExpanded] = useState(true);

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

    const { handleMenuAction } = useHomeMenuActions({
        currentUser,
        onRequireLockSetup: requireLockSetup,
        onRequireLockVerify: requireLockVerify
    });

    const { filteredItems, tabCounts } = useHomeFilters(combinedItems, activeTab, searchQuery, isVaultOpen);
    const { handleViewUserStatus } = useStatusActions(currentUser, loadFriends);

    useEffect(() => {
        if (currentUser && !profile) {
            useAuthStore.getState().syncProfile();
        }
    }, [currentUser, profile]);

    useEffect(() => {
        loadVaultPasscode();
    }, []);

    const handleSearchChange = useCallback((text: string) => {
        if (vaultPasscode && text === vaultPasscode) {
            setVaultOpen(true);
            setSearchQuery('');
            Keyboard.dismiss();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            setSearchQuery(text);
        }
    }, [vaultPasscode, setVaultOpen]);

    const handleLongPress = useCallback((friend: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedFriendForMenu(friend);
        setMenuVisible(true);
    }, []);

    const handleSelectFriend = useCallback((friend: any) => {
        if (!friend?.id) return;
        if (friend.isLocked) {
            openLockedChat(friend);
            return;
        }
        try {
            useFriendsStore.getState().clearUnreadCount(friend.id);
            const nameParam = encodeURIComponent(friend.name || 'Chat');
            const groupParam = friend.isGroup ? 'true' : 'false';
            const imageParam = encodeURIComponent(friend.img || '');
            const url = `/chat/${friend.id}?name=${nameParam}&isGroup=${groupParam}&image=${imageParam}`;
            setTimeout(() => { router.push(url as any); }, 10);
        } catch (err: any) {
            Alert.alert("Nav Error", err.message);
        }
    }, [router, openLockedChat]);

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
        />
    ), [handleSelectFriend, handleLongPress, handleViewUserStatus, handleImageClick]);

    if (loading && combinedItems.length === 0) {
        return <HomeSkeleton />;
    }

    return (
        <View style={{ flex: 1 }} {...swipeHandlers} collapsable={false}>
            <View style={{ flex: 1, backgroundColor: '#EBD8B7' }}>
                <HomeHeader
                    profile={profile}
                    pendingSentCount={pendingSentCount}
                    pendingReceivedCount={pendingReceivedCount}
                    unreadNotificationsCount={getCounts?.unread ?? 0}
                />

                <FlatList
                    style={{ flex: 1 }}
                    data={filteredItems}
                    keyExtractor={(item, index) => item.id?.toString() || item.email?.toString() || `item-${index}`}
                    contentContainerStyle={{ paddingBottom: 110 }}
                    ListHeaderComponent={
                        <View>
                            {isVaultOpen ? (
                                <View style={{ backgroundColor: '#111827', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderRadius: 12, marginHorizontal: 16, marginTop: 12 }}>
                                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>🥷 Ninja Vault Unlocked</Text>
                                    <TouchableOpacity onPress={() => setVaultOpen(false)} style={{ backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
                                        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Lock Vault</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <FilterTabs
                                    activeTab={activeTab}
                                    onTabChange={setActiveTab}
                                    counts={tabCounts}
                                    onSearchChange={handleSearchChange}
                                />
                            )}
                            {!isVaultOpen && activeTab === 'all' && !searchQuery && (showContactSuggestions || showNearbySuggestions) && (
                                <HomeSuggestions
                                    showContactSuggestions={showContactSuggestions}
                                    showNearbySuggestions={showNearbySuggestions}
                                    suggestionTab={suggestionTab}
                                    suggestionsExpanded={suggestionsExpanded}
                                    onSetSuggestionTab={setSuggestionTab}
                                    onToggleExpanded={() => setSuggestionsExpanded(prev => !prev)}
                                />
                            )}
                        </View>
                    }
                    renderItem={renderItem}
                    ListEmptyComponent={
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 80 }}>
                            <Text style={{ color: '#9CA3AF', textAlign: 'center' }}>
                                {activeTab === 'all' ? 'No chats found. Start a conversation with a friend!' : `No ${activeTab} found.`}
                            </Text>
                        </View>
                    }
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F68537" />}
                    initialNumToRender={15}
                    maxToRenderPerBatch={10}
                    windowSize={10}
                    removeClippedSubviews={true}
                />

                <FriendContextMenu
                    visible={menuVisible}
                    friend={selectedFriendForMenu}
                    onClose={() => setMenuVisible(false)}
                    onAction={handleMenuAction}
                />

                <ChatLockModal
                    visible={lockModalVisible}
                    mode={lockModalMode}
                    onClose={() => {
                        setLockModalVisible(false);
                        setPendingLockedFriend(null);
                    }}
                    onSuccess={handleLockModalSuccess}
                />

                <ImageZoomModal
                    imageUrl={selectedImageForZoom}
                    onClose={() => setSelectedImageForZoom(null)}
                />
            </View>
        </View>
    );
}

export default HomeScreen;

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
