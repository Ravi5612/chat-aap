import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFriends } from '@/hooks/useFriends';
import { useStatusActions } from '@/hooks/useStatusActions';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';

export default function StatusScreen() {
    const router = useRouter();
    const swipeHandlers = useSwipeNavigation();
    const { combinedItems, myStatuses, loading, loadFriends } = useFriends();
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
    }, []);

    const {
        viewingStatus,
        setShowAddStatus,
        handleViewUserStatus,
        handleViewMyStatus,
    } = useStatusActions(currentUser, loadFriends);

    const friendsWithStatus = combinedItems.filter(item => item.statusCount > 0);

    if (loading && combinedItems.length === 0) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#F68537" />
            </View>
        );
    }

    return (
        <View className="flex-1" {...swipeHandlers} collapsable={false}>
            <SafeAreaView className="flex-1 bg-white">
                <View className="px-4 py-4 border-b border-gray-100 flex-row justify-between items-center">
                    <Text className="text-2xl font-bold text-[#F68537]">Status</Text>
                    <TouchableOpacity
                        onPress={() => setShowAddStatus(true)}
                        className="bg-orange-50 p-2 rounded-full"
                    >
                        <Ionicons name="camera-outline" size={24} color="#F68537" />
                    </TouchableOpacity>
                </View>

                <ScrollView className="flex-1">
                    {/* My Status */}
                    <TouchableOpacity
                        onPress={handleViewMyStatus}
                        className="flex-row items-center px-4 py-4 border-b border-gray-50"
                    >
                        <View className="relative">
                            <View className={`w-16 h-16 rounded-full p-1 border-2 ${myStatuses?.length > 0 ? 'border-[#F68537]' : 'border-gray-200 border-dashed'}`}>
                                <View className="w-full h-full rounded-full overflow-hidden bg-gray-100 items-center justify-center">
                                    {myStatuses?.length > 0 ? (
                                        myStatuses[0].media_type === 'text' ? (
                                            <View className="w-full h-full items-center justify-center" style={{ backgroundColor: myStatuses[0].background_color || '#F68537' }}>
                                                <Text className="text-white font-bold">{myStatuses[0].content?.charAt(0)}</Text>
                                            </View>
                                        ) : (
                                            <Image
                                                source={{ uri: myStatuses[0].media_url }}
                                                className="w-full h-full"
                                            />
                                        )
                                    ) : (
                                        <Ionicons name="person" size={32} color="#CBD5E1" />
                                    )}
                                </View>
                            </View>
                            {!myStatuses?.length && (
                                <View className="absolute bottom-0 right-0 bg-[#F68537] rounded-full p-0.5 border-2 border-white">
                                    <Ionicons name="add" size={14} color="white" />
                                </View>
                            )}
                        </View>
                        <View className="ml-4">
                            <Text className="text-base font-semibold">My status</Text>
                            <Text className="text-gray-500 text-sm">{myStatuses?.length > 0 ? 'Tap to view' : 'Tap to add status update'}</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Friend Statuses */}
                    <View className="bg-gray-50 px-4 py-2">
                        <Text className="text-gray-400 font-bold text-xs uppercase">Recent updates</Text>
                    </View>

                    {friendsWithStatus.length > 0 ? (
                        friendsWithStatus.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                onPress={() => handleViewUserStatus(item)}
                                className="flex-row items-center px-4 py-4 border-b border-gray-50"
                            >
                                <View className={`w-14 h-14 rounded-full p-0.5 border-2 ${item.allStatusesViewed ? 'border-gray-200' : 'border-green-500'}`}>
                                    <Image
                                        source={{ uri: item.img || 'https://via.placeholder.com/150' }}
                                        className="w-full h-full rounded-full"
                                    />
                                </View>
                                <View className="ml-4">
                                    <Text className="text-base font-semibold">{item.name}</Text>
                                    <Text className="text-gray-500 text-sm">Tap to view</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View className="items-center justify-center p-10 mt-10">
                            <Ionicons name="images-outline" size={64} color="#CBD5E1" />
                            <Text className="text-gray-400 mt-4 text-center">No status updates yet.</Text>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
