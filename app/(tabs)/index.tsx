import { View, FlatList, ActivityIndicator, Text, RefreshControl, TouchableOpacity, Image, StyleSheet, Platform, Modal, ScrollView, Clipboard } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useFriends } from '@/hooks/useFriends';
import { useAuthStore } from '@/store/useAuthStore';
import FriendListItem from '@/components/chat/FriendListItem';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useStatusActions } from '@/hooks/useStatusActions';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@/hooks/useNotifications';
import FilterTabs from '@/components/chat/FilterTabs';
import ContactSuggestions from '@/components/chat/ContactSuggestions';
import NearbySuggestions from '@/components/chat/NearbySuggestions';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import FriendContextMenu from '@/components/chat/FriendContextMenu';
import { useReceivedRequests } from '@/hooks/useReceivedRequests';
import { useSentRequests } from '@/hooks/useSentRequests';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Skeleton } from '@/components/ui/Skeleton';
import { GlassHeader } from '@/components/ui/GlassHeader';
import { useFriendsStore } from '@/store/useFriendsStore';
import ChatLockModal from '@/components/chat/ChatLockModal';
import * as SecureStore from 'expo-secure-store';

function HomeScreen() {

  const router = useRouter();
  const swipeHandlers = useSwipeNavigation();
  const { user: currentUser, profile } = useAuthStore();
  const { combinedItems, myStatuses, loading, error, loadFriends } = useFriends();
  const { receivedRequests } = useReceivedRequests();
  const { sentRequests } = useSentRequests();
  const { getCounts } = useNotifications();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriendForMenu, setSelectedFriendForMenu] = useState<any>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedImageForZoom, setSelectedImageForZoom] = useState<string | null>(null);
  const [lockModalVisible, setLockModalVisible] = useState(false);
  const [lockModalMode, setLockModalMode] = useState<'verify' | 'setup'>('verify');
  const [lockModalTask, setLockModalTask] = useState<'open' | 'unlock'>('open');
  const [pendingLockedFriend, setPendingLockedFriend] = useState<any>(null);
  const [showContactSuggestions, setShowContactSuggestions] = useState(true);
  const [showNearbySuggestions, setShowNearbySuggestions] = useState(true);
  const [suggestionTab, setSuggestionTab] = useState<'contacts' | 'nearby'>('contacts');
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true);


  // Ensure profile is loaded when Home screen mounts
  useEffect(() => {
    if (currentUser && !profile) {
      useAuthStore.getState().syncProfile();
    }
  }, [currentUser, profile]);

  const onTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleLongPress = (friend: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedFriendForMenu(friend);
    setMenuVisible(true);
  };

  const handleMenuAction = async (action: string, friend: any) => {
    Haptics.selectionAsync();
    switch (action) {
      case 'profile':
        router.push(`/profile/${friend.id}` as any);
        break;
      case 'group':
        if (friend.isGroup) {
          Alert.alert("Coming Soon", "Group management is under construction.");
        } else {
          router.push(`/new-group?initialMemberId=${friend.id}` as any);
        }
        break;
      case 'block':
        Alert.alert(
          "Block User",
          `Are you sure you want to block ${friend.name}? They will not be able to message or call you.`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Block",
              style: "destructive",
              onPress: async () => {
                const { blockUser } = useFriendsStore.getState();
                await blockUser(currentUser.id, friend.id);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            }
          ]
        );
        break;
      case 'unblock':
        Alert.alert(
          "Unblock User",
          `Are you sure you want to unblock ${friend.name}?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Unblock",
              onPress: async () => {
                const { unblockUser } = useFriendsStore.getState();
                await unblockUser(currentUser.id, friend.id);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            }
          ]
        );
        break;

      case 'unfriend':
        Alert.alert(
          "Unfriend",
          `Kya aap sach me ${friend.name} ko unfriend karna chahte ho?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Unfriend",
              style: "destructive",
              onPress: async () => {
                try {
                  const { error } = await supabase
                    .from('friendships')
                    .delete()
                    .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${friend.id}),and(user_id.eq.${friend.id},friend_id.eq.${currentUser.id})`);

                  if (error) throw error;

                  const { db } = useDbStore.getState();
                  if (db) {
                    await db.runAsync("UPDATE conversations SET last_message = last_message WHERE id = ?", [friend.id]);
                  }

                  useFriendsStore.setState((state) => ({
                    friends: state.friends.filter(f => f.id !== friend.id),
                    combinedItems: state.combinedItems.map(f => f.id === friend.id ? { ...f, isUnfriended: true } : f)
                  }));

                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch (e: any) {
                  Alert.alert("Error", `Unfriend nahi ho saka: ${e.message}`);
                }
              }
            }
          ]
        );
        break;

      case 'delete':
        Alert.alert(
          "Delete Chat",
          `Are you sure you want to delete your chat with ${friend.name}? This will only delete the chat for you.`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete for Me",
              style: "destructive",
              onPress: async () => {
                try {
                  const { db } = useDbStore.getState();
                  if (db) {
                    await clearLocalChat(db, friend.id);
                    await saveChatClearTimestamp(db, friend.id, new Date().toISOString());
                    
                    // Clear locally in Zustand
                    useChatStore.setState((state) => {
                        const newCache = { ...state.cache };
                        if (newCache[friend.id]) newCache[friend.id] = { ...newCache[friend.id], messages: [] };
                        return { messages: [], cache: newCache };
                    });
                    
                    useFriendsStore.setState((state) => ({
                        combinedItems: state.combinedItems.filter(i => i.id !== friend.id)
                    }));
                  }
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch (e) {
                  Alert.alert("Error", "Failed to clear chat");
                }
              }
            }
          ]
        );
        break;
      case 'lock':
        const storedPassword = await SecureStore.getItemAsync('chat_lock_password');
        if (!storedPassword) {
            setPendingLockedFriend(friend);
            setLockModalMode('setup');
            setLockModalVisible(true);
        } else {
            const { lockChat } = useFriendsStore.getState();
            await lockChat(friend.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Chat Locked", "This chat is now moved to the Locked tab.");
        }
        break;

      case 'unlock':
        setPendingLockedFriend(friend);
        setLockModalMode('verify');
        setLockModalTask('unlock');
        setLockModalVisible(true);
        break;
      default:
        console.log('Action not implemented:', action);
    }

  };

  const {
    viewingStatus,
    setShowAddStatus,
    handleViewUserStatus,
    handleViewMyStatus,
  } = useStatusActions(currentUser, loadFriends);

  const handleSelectFriend = useCallback((friend: any) => {
    if (!friend?.id) return;

    if (friend.isLocked) {
        setPendingLockedFriend(friend);
        setLockModalMode('verify');
        setLockModalTask('open');
        setLockModalVisible(true);
        return;
    }

    try {
        const nameParam = encodeURIComponent(friend.name || 'Chat');
        const groupParam = friend.isGroup ? 'true' : 'false';
        const imageParam = encodeURIComponent(friend.img || '');
        const url = `/chat/${friend.id}?name=${nameParam}&isGroup=${groupParam}&image=${imageParam}`;
        
        setTimeout(() => {
            router.push(url as any);
        }, 10);
    } catch (err: any) {
        Alert.alert("Nav Error", err.message);
    }
  }, [router]);


  const handleImageClick = useCallback((friend: any) => {
    setSelectedImageForZoom(friend.img || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(friend.name)}&backgroundColor=F68537`);
  }, []);

  const filteredItems = useMemo(() => {
    return combinedItems.filter(item => {
      let tabMatch = true;
      if (activeTab === 'all') tabMatch = !item.isArchived && !item.isLocked;
      else if (activeTab === 'friends') tabMatch = !item.isGroup && !item.isArchived && !item.isLocked;
      else if (activeTab === 'groups') tabMatch = item.isGroup && !item.isArchived && !item.isLocked;
      else if (activeTab === 'favourites') tabMatch = item.isFavorite && !item.isArchived && !item.isLocked;
      else if (activeTab === 'archive') tabMatch = item.isArchived && !item.isLocked;
      else if (activeTab === 'locked') tabMatch = item.isLocked;

      const searchMatch = !searchQuery ||
        (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase()));

      return tabMatch && searchMatch;
    });
  }, [combinedItems, activeTab, searchQuery]);

  const tabCounts = useMemo(() => ({
    all: combinedItems.filter(i => !i.isArchived && !i.isLocked).length,
    friends: combinedItems.filter(i => !i.isGroup && !i.isArchived && !i.isLocked).length,
    groups: combinedItems.filter(i => i.isGroup && !i.isArchived && !i.isLocked).length,
    favourites: combinedItems.filter(i => i.isFavorite && !i.isArchived && !i.isLocked).length,
    archive: combinedItems.filter(i => i.isArchived && !i.isLocked).length,
    locked: combinedItems.filter(i => i.isLocked).length,
  }), [combinedItems]);


  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!currentUser) return;
    setRefreshing(true);
    await loadFriends(currentUser.id, true);
    setRefreshing(false);
  }, [currentUser, loadFriends]);

  const pendingSentCount = useMemo(() => sentRequests.filter(r => r.status === 'pending').length, [sentRequests]);

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
    return (
      <View style={{ flex: 1, backgroundColor: '#EBD8B7' }}>
        <GlassHeader>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Skeleton width={48} height={48} borderRadius={24} />
            <Skeleton width={100} height={20} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Skeleton width={120} height={36} borderRadius={18} />
            <Skeleton width={32} height={32} borderRadius={16} />
          </View>
        </GlassHeader>
        <View style={{ padding: 16 }}>
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <Skeleton width={56} height={56} borderRadius={28} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="60%" height={18} />
                <Skeleton width="40%" height={14} />
              </View>
              <Skeleton width={40} height={12} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} {...swipeHandlers} collapsable={false}>
      <View style={{ flex: 1, backgroundColor: '#EBD8B7' }}>
        <GlassHeader>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile' as any)}>
              <Image
                source={{ uri: profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile?.username || 'User')}&backgroundColor=F68537` }}
                style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: Platform.OS === 'android' ? 'white' : '#F68537' }}
              />
            </TouchableOpacity>
            <Text style={{
              color: Platform.OS === 'android' ? 'white' : '#F68537',
              fontWeight: 'bold',
              fontSize: 18,
              textTransform: 'lowercase'
            }}>{profile?.username || 'user'}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Search Button */}
            <TouchableOpacity
              onPress={() => {
                router.push('/search' as any);
              }}
              style={{
                backgroundColor: Platform.OS === 'android' ? 'white' : '#F68537',
                borderRadius: 9999,
                paddingLeft: 10,
                paddingRight: 4,
                paddingVertical: 4,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Text style={{
                color: Platform.OS === 'android' ? '#F68537' : 'white',
                fontWeight: '900',
                fontSize: 9,
                letterSpacing: -0.5
              }}>SEARCH</Text>
              <View style={{ backgroundColor: Platform.OS === 'android' ? '#F68537' : 'white', padding: 4, borderRadius: 9999 }}>
                <Ionicons name="search" size={12} color={Platform.OS === 'android' ? 'white' : '#F68537'} />
              </View>
            </TouchableOpacity>

            {/* Sent Requests */}
            <TouchableOpacity
              onPress={() => {
                router.push('/sent-requests' as any);
              }}
              style={{ position: 'relative' }}
            >
              <Ionicons name="paper-plane-outline" size={26} color={Platform.OS === 'android' ? 'white' : '#F68537'} />
              {pendingSentCount > 0 && (
                <View style={{ position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 1, borderColor: Platform.OS === 'android' ? '#F68537' : 'white' }}>
                  <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>{pendingSentCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Received Friend Requests */}
            <TouchableOpacity
              onPress={() => {
                router.push('/friend-requests' as any);
              }}
              style={{ position: 'relative' }}
            >
              <Ionicons name="people-outline" size={26} color={Platform.OS === 'android' ? 'white' : '#F68537'} />
              {receivedRequests.filter(r => r.status === 'pending').length > 0 && (
                <View style={{ position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 1, borderColor: Platform.OS === 'android' ? '#F68537' : 'white' }}>
                  <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>{receivedRequests.filter(r => r.status === 'pending').length}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Notifications */}
            <TouchableOpacity
              onPress={() => {
                router.push('/notifications' as any);
              }}
              style={{ position: 'relative' }}
            >
              <Ionicons name="notifications-outline" size={26} color={Platform.OS === 'android' ? 'white' : '#F68537'} />
              {getCounts.unread > 0 && (
                <View style={{ backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1, position: 'absolute', top: -5, right: -10 }}>
                  <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>{getCounts.unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </GlassHeader>

        <FlatList
          style={{ flex: 1 }}
          data={filteredItems}
          keyExtractor={(item) => item.id?.toString() || item.email?.toString() || 'unknown'}
          contentContainerStyle={{ paddingBottom: 110 }}
          ListHeaderComponent={
            <View>
              <FilterTabs
                activeTab={activeTab}
                onTabChange={onTabChange}
                counts={tabCounts}
                onSearchChange={setSearchQuery}
              />
              {activeTab === 'all' && !searchQuery && (showContactSuggestions || showNearbySuggestions) && (
                <View style={{ marginTop: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: '#64748B', letterSpacing: 0.5 }}>SUGGESTIONS FROM</Text>
                      <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 20, padding: 2 }}>
                        {showContactSuggestions && (
                          <TouchableOpacity
                            onPress={() => setSuggestionTab('contacts')}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 4,
                              borderRadius: 18,
                              backgroundColor: suggestionTab === 'contacts' ? '#F68537' : 'transparent'
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: 'bold', color: suggestionTab === 'contacts' ? 'white' : '#64748B' }}>CONTACTS</Text>
                          </TouchableOpacity>
                        )}
                        {showNearbySuggestions && (
                          <TouchableOpacity
                            onPress={() => setSuggestionTab('nearby')}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 4,
                              borderRadius: 18,
                              backgroundColor: suggestionTab === 'nearby' ? '#F68537' : 'transparent'
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: 'bold', color: suggestionTab === 'nearby' ? 'white' : '#64748B' }}>NEARBY</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setSuggestionsExpanded(prev => !prev)} style={{ padding: 4 }}>
                      <Ionicons name={suggestionsExpanded ? "chevron-up" : "chevron-down"} size={22} color="#F68537" />
                    </TouchableOpacity>
                  </View>

                  {suggestionsExpanded && (
                    suggestionTab === 'contacts' && showContactSuggestions ? (
                      <ContactSuggestions />
                    ) : (
                      showNearbySuggestions && <NearbySuggestions />
                    )
                  )}
                </View>
              )}
            </View>
          }
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 80 }}>
              <Text style={{ color: '#9CA3AF', textAlign: 'center' }}>
                {activeTab === 'all'
                  ? 'No chats found. Start a conversation with a friend!'
                  : `No ${activeTab} found.`}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F68537" />
          }
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
          onSuccess={async () => {
              setLockModalVisible(false);
              if (lockModalMode === 'setup' && pendingLockedFriend) {
                  const { lockChat } = useFriendsStore.getState();
                  await lockChat(pendingLockedFriend.id);
                  Alert.alert("Chat Locked", "This chat is now moved to the Locked tab.");
              } else if (lockModalMode === 'verify' && pendingLockedFriend) {
                  if (lockModalTask === 'unlock') {
                      const { unlockChat } = useFriendsStore.getState();
                      await unlockChat(pendingLockedFriend.id);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      Alert.alert("Chat Unlocked", "This chat is now visible in the main list.");
                  } else {
                      const f = pendingLockedFriend;
                      const nameParam = encodeURIComponent(f.name || 'Chat');
                      const groupParam = f.isGroup ? 'true' : 'false';
                      const imageParam = encodeURIComponent(f.img || '');
                      router.push(`/chat/${f.id}?name=${nameParam}&isGroup=${groupParam}&image=${imageParam}` as any);
                  }
              }
              setPendingLockedFriend(null);
          }}
        />

        {/* Profile Image Zoom Modal */}
        <Modal
          visible={!!selectedImageForZoom}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedImageForZoom(null)}
        >
          <TouchableOpacity
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            activeOpacity={1}
            onPress={() => setSelectedImageForZoom(null)}
          >
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={{ width: '85%', aspectRatio: 1, backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 }}>
              <Image
                source={{ uri: selectedImageForZoom || '' }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => setSelectedImageForZoom(null)}
                style={{ position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 20, padding: 8 }}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </View>
  );
}

export default HomeScreen;

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
