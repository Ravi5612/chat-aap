import { View, Text, SafeAreaView, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from 'expo-router';

export default function NotificationsScreen() {
    const { notifications, loading, markAsRead, refresh } = useNotifications();
    const router = useRouter();

    const handleNotificationClick = (item: any) => {
        markAsRead(item.id);
        // Navigate based on type if needed
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-4 py-4 border-b border-gray-100 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="#F68537" />
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-[#F68537]">Notifications</Text>
            </View>

            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#F68537" />
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => handleNotificationClick(item)}
                        className={`px-4 py-4 border-b border-gray-50 flex-row items-center ${item.is_read ? 'opacity-60' : ''}`}
                    >
                        <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${item.type === 'friend_request' ? 'bg-blue-50' :
                                item.type === 'friend_accepted' ? 'bg-green-50' : 'bg-orange-50'
                            }`}>
                            <Ionicons
                                name={
                                    item.type === 'friend_request' ? 'person-add' :
                                        item.type === 'friend_accepted' ? 'checkmark-circle' : 'notifications'
                                }
                                size={24}
                                color={
                                    item.type === 'friend_request' ? '#3B82F6' :
                                        item.type === 'friend_accepted' ? '#10B981' : '#F68537'
                                }
                            />
                        </View>
                        <View className="flex-1">
                            <Text className={`text-base ${!item.is_read ? 'font-bold' : ''}`}>{item.message}</Text>
                            <Text className="text-gray-400 text-xs mt-1">
                                {new Date(item.created_at).toLocaleDateString()}
                            </Text>
                        </View>
                        {!item.is_read && (
                            <View className="w-2 h-2 bg-[#F68537] rounded-full ml-2" />
                        )}
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View className="flex-1 items-center justify-center p-10 mt-20">
                        <Ionicons name="notifications-off-outline" size={64} color="#CBD5E1" />
                        <Text className="text-gray-400 mt-4 text-center">No notifications yet.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}
