import { View, FlatList, ActivityIndicator, Text, RefreshControl, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useFriends } from '@/hooks/useFriends';
import { useAuthStore } from '@/store/useAuthStore';
import FriendListItem from '@/components/chat/FriendListItem';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useStatusActions } from '@/hooks/useStatusActions';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@/hooks/useNotifications';
import FilterTabs from '@/components/chat/FilterTabs';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import FriendContextMenu from '@/components/chat/FriendContextMenu';
import { useReceivedRequests } from '@/hooks/useReceivedRequests';
import { useSentRequests } from '@/hooks/useSentRequests';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Skeleton } from '@/components/ui/Skeleton';
import { GlassHeader } from '@/components/ui/GlassHeader';

export default function HomeScreen() {
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

  const onTabChange = (tab: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
          // TODO: Navigate to group details/edit screen
          Alert.alert("Coming Soon", "Group management is under construction.");
        } else {
          router.push(`/new-group?initialMemberId=${friend.id}` as any);
        }
        break;
      case 'delete':
        Alert.alert(
          "Delete Chat",
          `Are you sure you want to delete your chat with ${friend.name}?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                const { error } = await supabase
                  .from('friendships')
                  .delete()
                  .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
                  .or(`user_id.eq.${friend.id},friend_id.eq.${friend.id}`);

                if (!error) {
                  loadFriends();
                }
              }
            }
          ]
        );
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

  const handleSelectFriend = (friend: any) => {
    if (!friend?.id) {
      console.warn('HomeScreen: Cannot chat, friend.id is missing!', friend);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nameParam = encodeURIComponent(friend.name || 'Chat');
    const groupParam = friend.isGroup ? 'true' : 'false';
    const imageParam = encodeURIComponent(friend.img || '');
    const url = `/chat/${friend.id}?name=${nameParam}&isGroup=${groupParam}&image=${imageParam}`;
    router.push(url as any);
  };

  const filteredItems = combinedItems.filter(item => {
    // Tab filtering
    let tabMatch = true;
    if (activeTab === 'all') tabMatch = !item.isArchived;
    else if (activeTab === 'groups') tabMatch = item.isGroup && !item.isArchived;
    else if (activeTab === 'favourites') tabMatch = item.isFavorite && !item.isArchived;
    else if (activeTab === 'archive') tabMatch = item.isArchived;

    // Search query filtering
    const searchMatch = !searchQuery ||
      (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return tabMatch && searchMatch;
  });

  const tabCounts = {
    all: combinedItems.filter(i => !i.isArchived).length,
    groups: combinedItems.filter(i => i.isGroup && !i.isArchived).length,
    favourites: combinedItems.filter(i => i.isFavorite && !i.isArchived).length,
    archive: combinedItems.filter(i => i.isArchived).length,
  };

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
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

            {/* Sent Requests - 🆕 Added */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/sent-requests' as any);
              }}
              style={{ position: 'relative' }}
            >
              <Ionicons name="paper-plane-outline" size={26} color={Platform.OS === 'android' ? 'white' : '#F68537'} />
              {sentRequests.filter(r => r.status === 'pending').length > 0 && (
                <View style={{ position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 1, borderColor: Platform.OS === 'android' ? '#F68537' : 'white' }}>
                  <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>{sentRequests.filter(r => r.status === 'pending').length}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Received Friend Requests */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/notifications' as any);
              }}
              style={{ position: 'relative' }}
            >
              <Ionicons name="notifications-outline" size={26} color={Platform.OS === 'android' ? 'white' : '#F68537'} />
              {getCounts().unread > 0 && (
                <View style={{ position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 1, borderColor: Platform.OS === 'android' ? '#F68537' : 'white' }}>
                  <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>{getCounts().unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </GlassHeader>

        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={{ paddingBottom: 110 }}
          ListHeaderComponent={
            <FilterTabs
              activeTab={activeTab}
              onTabChange={onTabChange}
              counts={tabCounts}
              onSearchChange={setSearchQuery}
            />
          }
          renderItem={({ item }) => (
            <FriendListItem
              friend={item}
              onClick={handleSelectFriend}
              onLongPress={handleLongPress}
              isOnline={item.isOnline}
              onViewUserStatus={handleViewUserStatus}
            />
          )}
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
            <RefreshControl refreshing={loading} onRefresh={loadFriends} tintColor="#F68537" />
          }
        />

        <FriendContextMenu
          visible={menuVisible}
          friend={selectedFriendForMenu}
          onClose={() => setMenuVisible(false)}
          onAction={handleMenuAction}
        />
      </View>
    </View>
  );
}
