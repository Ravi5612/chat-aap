import { View, FlatList, ActivityIndicator, Text, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useFriends } from '@/hooks/useFriends';
import FriendListItem from '@/components/chat/FriendListItem';
import StatusBar from '@/components/chat/StatusBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useStatusActions } from '@/hooks/useStatusActions';
import { Ionicons } from '@expo/vector-icons';

import { useNotifications } from '@/hooks/useNotifications';
import FilterTabs from '@/components/chat/FilterTabs';

export default function HomeScreen() {
  const router = useRouter();
  const { combinedItems, myStatuses, loading, loadFriends } = useFriends();
  const { getCounts } = useNotifications();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, []);

  const {
    viewingStatus,
    setShowAddStatus,
    handleViewUserStatus,
    handleViewMyStatus,
  } = useStatusActions(currentUser, loadFriends);

  const handleSelectFriend = (friend: any) => {
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: friend.id,
        name: friend.name,
        isGroup: friend.isGroup ? 'true' : 'false'
      }
    });
  };

  const friendsWithStatus = combinedItems.filter(item => item.statusCount > 0);

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
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#F68537" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-4 py-4 border-b border-gray-100 flex-row justify-between items-center">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile' as any)}>
            <Image
              source={{ uri: currentUser?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser?.user_metadata?.name || 'User')}&backgroundColor=F68537` }}
              className="w-10 h-10 rounded-full bg-orange-100"
            />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-[#F68537]">Chat Warriors</Text>
        </View>
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={() => router.push('/search' as any)}>
            <Ionicons name="search-outline" size={24} color="#94A3B8" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/notifications' as any)}>
            <View className="relative">
              <Ionicons name="notifications-outline" size={24} color="#94A3B8" />
              {getCounts().unread > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 items-center justify-center border border-white">
                  <Text className="text-white text-[8px] font-bold">{getCounts().unread}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        ListHeaderComponent={
          <>
            <FilterTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              counts={tabCounts}
            />
          </>
        }
        renderItem={({ item }) => (
          <FriendListItem
            friend={item}
            onClick={handleSelectFriend}
            isOnline={item.isOnline}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadFriends} tintColor="#F68537" />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center p-10 mt-20">
            <Text className="text-gray-400 text-center">
              {activeTab === 'all'
                ? 'No chats found. Start a conversation with a friend!'
                : `No ${activeTab} found.`}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}


