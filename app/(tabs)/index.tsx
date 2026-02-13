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
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';

export default function HomeScreen() {
  const router = useRouter();
  const swipeHandlers = useSwipeNavigation();
  const { combinedItems, myStatuses, loading, error, loadFriends } = useFriends();
  const { getCounts } = useNotifications();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
    };
    fetchProfile();
  }, []);

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
      <View className="flex-1 items-center justify-center bg-[#EBD8B7] px-6">
        <ActivityIndicator size="large" color="#F68537" />
        <Text className="mt-4 text-[#F68537] font-bold text-lg">Connecting to ChatWarriors...</Text>
        {error && <Text className="mt-2 text-red-500 text-center font-medium bg-red-50 p-2 rounded-lg">Error: {error}</Text>}
        <TouchableOpacity onPress={loadFriends} className="mt-8 bg-[#F68537] px-6 py-3 rounded-xl shadow-sm">
          <Text className="text-white font-bold">Try Refreshing</Text>
        </TouchableOpacity>
      </View>
    );
  }

  console.log('HomeScreen: Rendering with swipe handlers...');
  return (
    <View className="flex-1" {...swipeHandlers} collapsable={false}>
      <SafeAreaView className="flex-1 bg-[#EBD8B7]">
        <View className="bg-[#F68537] px-4 py-4 flex-row justify-between items-center">
          <View className="flex-row items-center gap-2">
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile' as any)}>
              <Image
                source={{ uri: profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile?.username || 'User')}&backgroundColor=F68537` }}
                className="w-12 h-12 rounded-full border-2 border-white/30"
              />
            </TouchableOpacity>
            <Text className="text-white font-bold text-lg lowercase">{profile?.username || 'user'}</Text>
          </View>

          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => router.push('/search' as any)}
              className="bg-[#E67527] rounded-full pl-4 pr-1 py-1 flex-row items-center gap-2 border border-white/10"
            >
              <Text className="text-white font-black text-[10px] tracking-tight">SEARCH FRIEND</Text>
              <View className="bg-white p-1.5 rounded-full shadow-sm">
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
              isOnline={item.isOnline}
            />
          )}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center p-10 mt-20">
              <Text className="text-gray-400 text-center">
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
      </SafeAreaView>
    </View>
  );
}
