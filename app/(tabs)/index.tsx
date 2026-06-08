import { View, FlatList, Text, RefreshControl, Alert, Keyboard, TouchableOpacity, Share, AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
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
import { Ionicons } from '@expo/vector-icons';

// Extracted UI Components
import HomeHeader from '@/components/home/HomeHeader';
import HomeSkeleton from '@/components/home/HomeSkeleton';
import ImageZoomModal from '@/components/home/ImageZoomModal';
import HomeSuggestions from '@/components/home/HomeSuggestions';
import SOSButton from '@/components/home/SOSButton';

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
    }, []);

    const handleSearchChange = useCallback(async (text: string) => {
        if (vaultPasscode && text === vaultPasscode) {
            setSearchQuery('');
            Keyboard.dismiss();
            
            try {
                const hasHardware = await LocalAuthentication.hasHardwareAsync();
                const isEnrolled = await LocalAuthentication.isEnrolledAsync();

                if (hasHardware && isEnrolled) {
                    const result = await LocalAuthentication.authenticateAsync({
                        promptMessage: 'Unlock Ninja Vault',
                        fallbackLabel: 'Use Device Passcode',
                        disableDeviceFallback: false,
                    });
                    
                    if (result.success) {
                        setVaultOpen(true);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } else {
                        Alert.alert('Access Denied', 'Authentication failed.');
                    }
                } else {
                    // Fallback if no biometrics setup
                    setVaultOpen(true);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            } catch (err) {
                console.error("Local auth error:", err);
                // Fallback on error
                setVaultOpen(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
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
            const imageStr = typeof friend.img === 'object' && friend.img?.uri ? friend.img.uri : '';
            const imageParam = encodeURIComponent(imageStr);
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

    const handleShareApp = useCallback(async () => {
        try {
            await Share.share({
                message: 'Hey! Join me on ChatWarriors, a super fast and secure chat app! 🚀 Download it here: https://dummy-link.com/download',
            });
        } catch (error: any) {
            console.error('Error sharing app:', error);
        }
    }, []);

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

    // Removed full screen HomeSkeleton to prevent HomeSuggestions from flashing

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
                                <View style={{ 
                                    backgroundColor: '#111827', 
                                    padding: 16, 
                                    flexDirection: 'row', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    marginBottom: 8, 
                                    borderRadius: 16, 
                                    marginHorizontal: 16, 
                                    marginTop: 12,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 8 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 12,
                                    elevation: 8,
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.1)'
                                }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                            <Ionicons name="eye-off" size={20} color="#FBBF24" />
                                        </View>
                                        <View>
                                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 }}>Ninja Vault</Text>
                                            <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2, fontWeight: '600' }}>Unlocked & Visible</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity 
                                        onPress={() => {
                                            useFriendsStore.getState().setVaultOpen(false);
                                            setSearchQuery('');
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        }} 
                                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' }}
                                    >
                                        <Text style={{ color: '#F87171', fontSize: 13, fontWeight: 'bold' }}>Lock</Text>
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
                                    onToggleExpanded={toggleSuggestionsExpanded}
                                />
                            )}
                        </View>
                    }
                    renderItem={renderItem}
                    ListEmptyComponent={
                        loading ? (
                            <View style={{ marginTop: 20 }}>
                                <HomeSkeleton />
                            </View>
                        ) : (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 }}>
                                {searchQuery ? (
                                    <>
                                        <Ionicons name="search-outline" size={60} color="#D1D5DB" style={{ marginBottom: 16 }} />
                                        <Text style={{ color: '#6B7280', textAlign: 'center', fontSize: 16, fontWeight: '600' }}>
                                            No chats found
                                        </Text>
                                        <Text style={{ color: '#9CA3AF', textAlign: 'center', fontSize: 14, marginTop: 8 }}>
                                            Try searching with a different name.
                                        </Text>
                                    </>
                                ) : (
                                    <View style={{ alignItems: 'center', backgroundColor: '#FFFFFF', padding: 24, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, width: '100%' }}>
                                        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                            <Ionicons name="chatbubbles-outline" size={40} color="#F68537" />
                                        </View>
                                        <Text style={{ color: '#1F2937', textAlign: 'center', fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                                            It's quiet here...
                                        </Text>
                                        <Text style={{ color: '#6B7280', textAlign: 'center', fontSize: 14, lineHeight: 20, marginBottom: 24 }}>
                                            You don't have any friends on ChatWarriors yet. Invite your friends to start chatting!
                                        </Text>
                                        <TouchableOpacity 
                                            onPress={handleShareApp}
                                            style={{ backgroundColor: '#F68537', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}
                                        >
                                            <Ionicons name="share-social" size={20} color="white" style={{ marginRight: 8 }} />
                                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>
                                                Invite Friends
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )
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

                <SOSButton />
            </View>
        </View>
    );
}

export default HomeScreen;

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
