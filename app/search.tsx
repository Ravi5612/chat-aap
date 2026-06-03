import { View, Text, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useDbStore } from '@/store/useDbStore';
import { saveLocalSearch, getLocalSearches, clearLocalSearch } from '@/lib/localDb';
import * as Haptics from 'expo-haptics';
import { getVisibleAvatar } from '@/utils/privacyHelper';

export default function SearchPeopleScreen() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [recentSearches, setRecentSearches] = useState<any[]>([]);
    const router = useRouter();

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
        loadRecentSearches();
    }, []);

    const loadRecentSearches = async () => {
        const { db } = useDbStore.getState();
        if (db) {
            const data = await getLocalSearches(db, 'friend');
            setRecentSearches(data);
        }
    };

    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleSearch = (text: string) => {
        setQuery(text);
        
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (text.length < 2) {
            setResults([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        searchTimeoutRef.current = setTimeout(async () => {
            // Save to history (debounced)
            const { db } = useDbStore.getState();
            if (db && text.length > 3) {
                saveLocalSearch(db, text, 'friend').then(() => loadRecentSearches());
            }

            try {
                const [
                    profilesRes,
                    friendshipsRes,
                    sentRequestsRes,
                    receivedRequestsRes
                ] = await Promise.all([
                    supabase
                        .from('profiles')
                        .select('*')
                        .or(`username.ilike.%${text}%,email.ilike.%${text}%`)
                        .neq('id', currentUser?.id)
                        .limit(20),
                    supabase
                        .from('friendships')
                        .select('user_id, friend_id')
                        .or(`user_id.eq.${currentUser?.id},friend_id.eq.${currentUser?.id}`),
                    supabase
                        .from('friend_requests')
                        .select('receiver_id, status')
                        .eq('sender_id', currentUser?.id),
                    supabase
                        .from('friend_requests')
                        .select('sender_id, status')
                        .eq('receiver_id', currentUser?.id)
                ]);

                if (profilesRes.error) throw profilesRes.error;

                const profiles = profilesRes.data;
                if (!profiles || profiles.length === 0) {
                    setResults([]);
                    return;
                }

                const friendships = friendshipsRes.data;
                const sentRequests = sentRequestsRes.data;
                const receivedRequests = receivedRequestsRes.data;

                const friendIds = friendships?.map(f => f.user_id === currentUser?.id ? f.friend_id : f.user_id) || [];

                const finalResults = profiles.map(p => {
                    const isFriend = friendIds.includes(p.id);
                    const sentReq = sentRequests?.find(r => r.receiver_id === p.id);
                    const recReq = receivedRequests?.find(r => r.sender_id === p.id);
                    const visibleAvatar = getVisibleAvatar(p, currentUser?.id, isFriend, true);

                    return {
                        ...p,
                        avatar_url: visibleAvatar,
                        isFriend,
                        requestStatus: sentReq?.status || recReq?.status || null
                    };
                });

                setResults(finalResults);
            } catch (error: any) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }, 500); // 500ms debounce
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

            if (error) {
                // Revert optimistic update
                setResults(prev => prev.map(p => 
                    p.id === receiverId ? { ...p, requestStatus: null } : p
                ));
                
                if (error.code === '23503') { // Foreign key constraint violation
                    // Remove from search results
                    setResults(prev => prev.filter(p => p.id !== receiverId));
                    throw new Error("This user no longer exists or their account was deleted.");
                }
                
                throw error;
            }

            const { data: myProfile } = await supabase.from('profiles').select('username').eq('id', currentUser.id).single();

            await supabase.from('notifications').insert([{
                user_id: receiverId,
                sender_id: currentUser.id,
                type: 'friend_request',
                message: `${myProfile?.username || 'Someone'} sent you a friend request.`,
                is_read: false
            }]);

            DeviceEventEmitter.emit('friend_requests_changed');
            Alert.alert('Success', 'Friend request sent! ✅');
            handleSearch(query);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const cancelFriendRequest = async (receiverId: string) => {
        try {
            const { error } = await supabase
                .from('friend_requests')
                .delete()
                .eq('sender_id', currentUser.id)
                .eq('receiver_id', receiverId)
                .eq('status', 'pending');

            if (error) throw error;
            
            // Optimistic update
            setResults(prev => prev.map(p => 
                p.id === receiverId ? { ...p, requestStatus: null } : p
            ));
            DeviceEventEmitter.emit('friend_requests_changed');
        } catch (error: any) {
            Alert.alert('Error', 'Failed to cancel request: ' + error.message);
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
                                source={{ uri: item.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.username || 'User')}&backgroundColor=F68537` }}
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
                                <TouchableOpacity 
                                    onPress={() => cancelFriendRequest(item.id)}
                                    style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999 }}
                                >
                                    <Text style={{ color: '#1E40AF', fontWeight: 'bold' }}>Pending</Text>
                                </TouchableOpacity>
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
                        <View style={{ flex: 1 }}>
                            {query.length < 2 && recentSearches.length > 0 ? (
                                <View style={{ padding: 16 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#64748B' }}>RECENT SEARCHES</Text>
                                    </View>
                                    {recentSearches.map((item) => (
                                        <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                                            <TouchableOpacity 
                                                onPress={() => handleSearch(item.query)}
                                                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                                            >
                                                <Ionicons name="time-outline" size={20} color="#94A3B8" style={{ marginRight: 12 }} />
                                                <Text style={{ fontSize: 16, color: '#334155' }}>{item.query}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity 
                                                onPress={async () => {
                                                    const { db } = useDbStore.getState();
                                                    if (db) {
                                                        await clearLocalSearch(db, item.id);
                                                        loadRecentSearches();
                                                    }
                                                }}
                                                style={{ padding: 4 }}
                                            >
                                                <Ionicons name="close" size={20} color="#94A3B8" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 80 }}>
                                    <Ionicons name="people-outline" size={64} color="#CBD5E1" />
                                    <Text style={{ color: '#9CA3AF', marginTop: 16, textAlign: 'center' }}>
                                        {query.length < 2 ? 'Search for friends by username or email' : 'No users found'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
