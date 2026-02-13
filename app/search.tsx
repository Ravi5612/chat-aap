import { View, Text, SafeAreaView, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

export default function SearchPeopleScreen() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
    }, []);

    const handleSearch = async (text: string) => {
        setQuery(text);
        if (text.length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            // 1. Search profiles
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('*')
                .or(`username.ilike.%${text}%,email.ilike.%${text}%`)
                .neq('id', currentUser?.id)
                .limit(20);

            if (error) throw error;

            // 2. Check friendships and requests
            const profileIds = profiles.map(p => p.id);

            const { data: friendships } = await supabase
                .from('friendships')
                .select('friend_id')
                .eq('user_id', currentUser?.id)
                .in('friend_id', profileIds);

            const { data: requests } = await supabase
                .from('friend_requests')
                .select('receiver_id, status')
                .eq('sender_id', currentUser?.id)
                .in('receiver_id', profileIds);

            const friendIds = new Set(friendships?.map(f => f.friend_id));
            const requestMap = requests?.reduce((acc: any, r: any) => ({ ...acc, [r.receiver_id]: r.status }), {}) || {};

            const formatted = profiles.map(p => ({
                ...p,
                isFriend: friendIds.has(p.id),
                requestStatus: requestMap[p.id]
            }));

            setResults(formatted);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const sendFriendRequest = async (receiverId: string) => {
        try {
            const { error } = await supabase
                .from('friend_requests')
                .insert([{
                    sender_id: currentUser.id,
                    receiver_id: receiverId,
                    status: 'pending'
                }]);

            if (error) throw error;

            const { data: myProfile } = await supabase.from('profiles').select('username').eq('id', currentUser.id).single();

            await supabase.from('notifications').insert([{
                user_id: receiverId,
                sender_id: currentUser.id,
                type: 'friend_request',
                message: `${myProfile?.username || 'Someone'} sent you a friend request.`,
                is_read: false
            }]);

            Alert.alert('Success', 'Friend request sent! ✅');
            handleSearch(query); // Refresh results
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-4 py-4 border-b border-gray-100 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="#F68537" />
                </TouchableOpacity>
                <View className="flex-1 bg-gray-100 rounded-full flex-row items-center px-4">
                    <Ionicons name="search" size={20} color="#94A3B8" />
                    <TextInput
                        placeholder="Search for people..."
                        className="flex-1 py-2 ml-2"
                        value={query}
                        onChangeText={handleSearch}
                        autoFocus
                    />
                </View>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#F68537" />
                </View>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View className="px-4 py-4 border-b border-gray-50 flex-row items-center">
                            <Image
                                source={{ uri: item.avatar_url || 'https://via.placeholder.com/150' }}
                                className="w-12 h-12 rounded-full mr-4"
                            />
                            <View className="flex-1">
                                <Text className="text-lg font-bold">{item.username || 'User'}</Text>
                                <Text className="text-gray-500 text-sm">{item.email}</Text>
                            </View>
                            {item.isFriend ? (
                                <View className="bg-green-50 px-4 py-2 rounded-full">
                                    <Text className="text-green-600 font-bold">Friends</Text>
                                </View>
                            ) : item.requestStatus === 'pending' ? (
                                <View className="bg-blue-50 px-4 py-2 rounded-full">
                                    <Text className="text-blue-600 font-bold">Pending</Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    onPress={() => sendFriendRequest(item.id)}
                                    className="bg-[#F68537] px-6 py-2 rounded-full"
                                >
                                    <Text className="text-white font-bold">Add</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center p-10 mt-20">
                            <Ionicons name="people-outline" size={64} color="#CBD5E1" />
                            <Text className="text-gray-400 mt-4 text-center">
                                {query.length < 2 ? 'Search for friends by username or email' : 'No users found'}
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
