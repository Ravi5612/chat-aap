import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFriends } from '@/hooks/useFriends';
import { useStatusActions } from '@/hooks/useStatusActions';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import StatusBar from '@/components/chat/StatusBar';

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
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }}>
                <ActivityIndicator size="large" color="#F68537" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }} {...swipeHandlers} collapsable={false}>
            <SafeAreaView style={{ flex: 1, backgroundColor: '#EBD8B7' }}>
                {/* 1. Header with Close Button */}
                <View style={{ paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: '#1E293B', letterSpacing: -0.5 }}>Status</Text>
                        <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>Recent Updates</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
                        <Ionicons name="close" size={24} color="#64748B" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={loadFriends} tintColor="#F68537" />}
                >
                    {/* 2. Unified Status Bar Card */}
                    <StatusBar
                        myStatuses={myStatuses}
                        friendsWithStatus={combinedItems.filter(i => !i.isGroup && i.statusCount > 0)}
                        onAddClick={() => setShowAddStatus(true)}
                        onViewStatus={handleViewUserStatus}
                        onViewMyStatus={handleViewMyStatus}
                    />

                    {/* 3. Recent Updates Vertical Section */}
                    <View style={{ marginTop: 20, paddingHorizontal: 20 }}>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1E293B', marginBottom: 16 }}>Recent Updates</Text>

                        {friendsWithStatus.length > 0 ? (
                            friendsWithStatus.map((item) => {
                                // Find the latest status to show preview
                                const latestStatus = item.statuses?.[0] || {};
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        onPress={() => handleViewUserStatus(item)}
                                        activeOpacity={0.9}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: 'white',
                                            padding: 14,
                                            borderRadius: 24,
                                            marginBottom: 12,
                                            shadowColor: '#000',
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowOpacity: 0.04,
                                            shadowRadius: 10,
                                            elevation: 1
                                        }}
                                    >
                                        {/* Profile with Ring */}
                                        <View style={{ position: 'relative' }}>
                                            <View style={{
                                                width: 60,
                                                height: 60,
                                                borderRadius: 30,
                                                padding: 2,
                                                borderWidth: 2,
                                                borderColor: item.allStatusesViewed ? '#E2E8F0' : '#F68537'
                                            }}>
                                                <Image
                                                    source={{ uri: item.img || 'https://via.placeholder.com/150' }}
                                                    style={{ width: '100%', height: '100%', borderRadius: 30 }}
                                                />
                                            </View>
                                            <View style={{
                                                position: 'absolute',
                                                bottom: 2,
                                                right: 2,
                                                width: 14,
                                                height: 14,
                                                backgroundColor: '#10B981',
                                                borderRadius: 7,
                                                borderWidth: 2,
                                                borderColor: 'white'
                                            }} />
                                            {/* Count Badge on Avatar parity */}
                                            <View style={{
                                                position: 'absolute',
                                                bottom: -4,
                                                right: -4,
                                                backgroundColor: '#F68537',
                                                width: 20,
                                                height: 20,
                                                borderRadius: 10,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderWidth: 2,
                                                borderColor: 'white'
                                            }}>
                                                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{item.statusCount}</Text>
                                            </View>
                                        </View>

                                        {/* Info */}
                                        <View style={{ marginLeft: 16, flex: 1 }}>
                                            <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1E293B' }} numberOfLines={1}>{item.name}</Text>
                                            <Text style={{ fontSize: 12, color: '#F68537', marginTop: 2 }} numberOfLines={1}>{item.email || 'friend@chat.com'}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                                                <Ionicons name="time-outline" size={12} color="#94A3B8" />
                                                <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600' }}>4 minutes ago</Text>
                                            </View>
                                        </View>

                                        {/* Status Preview Thumbnail */}
                                        <View style={{
                                            width: 50,
                                            height: 50,
                                            borderRadius: 12,
                                            overflow: 'hidden',
                                            backgroundColor: '#FDBA74', // Saffron light
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundColor: (latestStatus.background_color && latestStatus.media_type === 'text') ? latestStatus.background_color : '#FDBA74'
                                        }}>
                                            {latestStatus.media_type === 'text' ? (
                                                <Text style={{ color: 'white', fontWeight: '900', fontSize: 10 }}>{latestStatus.content?.substring(0, 3).toUpperCase()}</Text>
                                            ) : (
                                                <Image
                                                    source={{ uri: latestStatus.media_url || item.img }}
                                                    style={{ width: '100%', height: '100%' }}
                                                />
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        ) : (
                            <View style={{ alignItems: 'center', justifyContent: 'center', padding: 60, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 32 }}>
                                <Ionicons name="images-outline" size={64} color="#64748B" />
                                <Text style={{ color: '#64748B', marginTop: 16, textAlign: 'center', fontWeight: '900', fontSize: 12, textTransform: 'uppercase' }}>No status updates yet.</Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
