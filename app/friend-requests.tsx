import { View, Text, SafeAreaView, FlatList, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useReceivedRequests } from '@/hooks/useReceivedRequests';
import { useRouter } from 'expo-router';

export default function FriendRequestsScreen() {
    const { receivedRequests, loading, acceptRequest, rejectRequest, refresh } = useReceivedRequests();
    const router = useRouter();

    const pendingRequests = receivedRequests.filter(r => r.status === 'pending');

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-4 py-4 border-b border-gray-100 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="#F68537" />
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-[#F68537]">Friend Requests</Text>
            </View>

            <FlatList
                data={pendingRequests}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#F68537" />
                }
                renderItem={({ item }) => (
                    <View className="px-4 py-4 border-b border-gray-50 flex-row items-center">
                        <Image
                            source={{ uri: item.sender.avatar_url || 'https://via.placeholder.com/150' }}
                            className="w-14 h-14 rounded-full mr-4"
                        />
                        <View className="flex-1">
                            <Text className="text-lg font-bold">{item.sender.username}</Text>
                            <Text className="text-gray-500 text-sm">wants to be your friend</Text>
                            <View className="flex-row mt-3 gap-3">
                                <TouchableOpacity
                                    onPress={() => acceptRequest(item.id, item.sender_id)}
                                    className="bg-[#F68537] px-6 py-2 rounded-full"
                                >
                                    <Text className="text-white font-bold">Accept</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => rejectRequest(item.id)}
                                    className="bg-gray-100 px-6 py-2 rounded-full"
                                >
                                    <Text className="text-gray-700 font-bold">Reject</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
                ListEmptyComponent={
                    <View className="flex-1 items-center justify-center p-10 mt-20">
                        <Ionicons name="people-outline" size={64} color="#CBD5E1" />
                        <Text className="text-gray-400 mt-4 text-center">No pending requests.</Text>
                        <TouchableOpacity
                            onPress={() => router.push('/notifications' as any)}
                            className="mt-6 border border-[#F68537] px-6 py-2 rounded-full"
                        >
                            <Text className="text-[#F68537] font-bold">View History</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </SafeAreaView>
    );
}
