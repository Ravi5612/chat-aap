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
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('*')
                .or(`username.ilike.%${text}%,email.ilike.%${text}%`)
                .neq('id', currentUser?.id)
                .limit(20);

            if (error) throw error;

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
            handleSearch(query);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
                    <Ionicons name="arrow-back" size={24} color="#F68537" />
                </TouchableOpacity>
                <View style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 9999, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
                    <Ionicons name="search" size={20} color="#94A3B8" />
                    <TextInput
                        placeholder="Search for people..."
                        style={{ flex: 1, paddingVertical: 8, marginLeft: 8 }}
                        value={query}
                        onChangeText={handleSearch}
                        autoFocus
                    />
                </View>
            </View>

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color="#F68537" />
                </View>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={{ paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F9FAFB', flexDirection: 'row', alignItems: 'center' }}>
                            <Image
                                source={{ uri: item.avatar_url || 'https://via.placeholder.com/150' }}
                                style={{ width: 48, height: 48, borderRadius: 24, marginRight: 16 }}
                            />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{item.username || 'User'}</Text>
                                <Text style={{ color: '#6B7280', fontSize: 14 }}>{item.email}</Text>
                            </View>
                            {item.isFriend ? (
                                <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999 }}>
                                    <Text style={{ color: '#166534', fontWeight: 'bold' }}>Friends</Text>
                                </View>
                            ) : item.requestStatus === 'pending' ? (
                                <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999 }}>
                                    <Text style={{ color: '#1E40AF', fontWeight: 'bold' }}>Pending</Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    onPress={() => sendFriendRequest(item.id)}
                                    style={{ backgroundColor: '#F68537', paddingHorizontal: 24, paddingVertical: 8, borderRadius: 9999 }}
                                >
                                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Add</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 80 }}>
                            <Ionicons name="people-outline" size={64} color="#CBD5E1" />
                            <Text style={{ color: '#9CA3AF', marginTop: 16, textAlign: 'center' }}>
                                {query.length < 2 ? 'Search for friends by username or email' : 'No users found'}
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
