import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from 'expo-router';

export default function NotificationsScreen() {
    const { notifications, loading, markAsRead, refresh } = useNotifications();
    const router = useRouter();

    const handleNotificationClick = (item: any) => {
        markAsRead(item.id);
        if (item.type === 'friend_request') {
            router.push('/friend-requests' as any);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
                    <Ionicons name="arrow-back" size={24} color="#F68537" />
                </TouchableOpacity>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#F68537' }}>Notifications</Text>
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
                        style={{ paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F9FAFB', flexDirection: 'row', alignItems: 'center', opacity: item.is_read ? 0.6 : 1 }}
                    >
                        <View style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 16,
                            backgroundColor: item.type === 'friend_request' ? '#EFF6FF' :
                                item.type === 'friend_accepted' ? '#ECFDF5' : '#FFF7ED'
                        }}>
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
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: !item.is_read ? 'bold' : 'normal', color: '#1F2937' }}>{item.message}</Text>
                            <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>
                                {new Date(item.created_at).toLocaleDateString()}
                            </Text>
                        </View>
                        {!item.is_read && (
                            <View style={{ width: 8, height: 8, backgroundColor: '#F68537', borderRadius: 4, marginLeft: 8 }} />
                        )}
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 80 }}>
                        <Ionicons name="notifications-off-outline" size={64} color="#CBD5E1" />
                        <Text style={{ color: '#94A3B8', marginTop: 16, textAlign: 'center' }}>No notifications yet.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}
