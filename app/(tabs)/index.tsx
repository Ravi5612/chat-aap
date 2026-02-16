import { View, FlatList, ActivityIndicator, Text, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useFriends } from '@/hooks/useFriends';
import { useAuthStore } from '@/store/useAuthStore';
import FriendListItem from '@/components/chat/FriendListItem';
import StatusBar from '@/components/chat/StatusBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useStatusActions } from '@/hooks/useStatusActions';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@/hooks/useNotifications';
import FilterTabs from '@/components/chat/FilterTabs';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import FriendContextMenu from '@/components/chat/FriendContextMenu';
import { Alert } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const swipeHandlers = useSwipeNavigation();
  const { user: currentUser, profile } = useAuthStore();
  const { combinedItems, myStatuses, loading, error, loadFriends } = useFriends();
  const { getCounts } = useNotifications();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedFriendForMenu, setSelectedFriendForMenu] = useState<any>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const handleLongPress = (friend: any) => {
    setSelectedFriendForMenu(friend);
    setMenuVisible(true);
  };

  const handleMenuAction = async (action: string, friend: any) => {
    switch (action) {
      case 'profile':
        router.push(`/profile/${friend.id}` as any);
        break;
      case 'group':
        // Navigation for group features
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
    const nameParam = encodeURIComponent(friend.name || 'Chat');
    const groupParam = friend.isGroup ? 'true' : 'false';
    const imageParam = encodeURIComponent(friend.img || '');
    const url = `/chat/${friend.id}?name=${nameParam}&isGroup=${groupParam}&image=${imageParam}`;
    console.log('HomeScreen: Navigating to:', url);
    router.push(url as any);
  };

  const filteredItems = combinedItems.filter(item => {
    if (activeTab === 'all') return !item.isArchived;
    if (activeTab === 'groups') return item.isGroup && !item.isArchived;
    if (activeTab === 'favourites') return item.isFavorite && !item.isArchived;
    if (activeTab === 'archive') return item.isArchived;
    return true;
  });

  const tabCounts = {
    all: combinedItems.filter(i => !i.isArchived).length,
    groups: combinedItems.filter(i => i.isGroup && !i.isArchived).length,
    favourites: combinedItems.filter(i => i.isFavorite && !i.isArchived).length,
    archive: combinedItems.filter(i => i.isArchived).length,
  };

  if (loading && combinedItems.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EBD8B7', paddingHorizontal: 24 }}>
        <ActivityIndicator size="large" color="#F68537" />
        <Text style={{ marginTop: 16, color: '#F68537', fontWeight: 'bold', fontSize: 18 }}>Connecting to ChatWarriors...</Text>
        {error && <Text style={{ marginTop: 8, color: '#EF4444', textAlign: 'center', fontWeight: '500', backgroundColor: '#FEF2F2', padding: 8, borderRadius: 8 }}>Error: {error}</Text>}
        <TouchableOpacity onPress={loadFriends} style={{ marginTop: 32, backgroundColor: '#F68537', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Try Refreshing</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} {...swipeHandlers} collapsable={false}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#EBD8B7' }}>
        <View style={{ backgroundColor: '#F68537', paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile' as any)}>
              <Image
                source={{ uri: profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile?.username || 'User')}&backgroundColor=F68537` }}
                style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.3)' }}
              />
            </TouchableOpacity>
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18, textTransform: 'lowercase' }}>{profile?.username || 'user'}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={() => router.push('/search' as any)}
              style={{ backgroundColor: '#E67527', borderRadius: 9999, paddingLeft: 16, paddingRight: 4, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 10, letterSpacing: -0.5 }}>SEARCH FRIEND</Text>
              <View style={{ backgroundColor: 'white', padding: 6, borderRadius: 9999, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}>
                <Ionicons name="search" size={16} color="#F68537" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { }}>
              <Ionicons name="menu-outline" size={32} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={{ paddingBottom: 110 }}
          ListHeaderComponent={
            <FilterTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              counts={tabCounts}
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
      </SafeAreaView>
    </View>
  );
}
