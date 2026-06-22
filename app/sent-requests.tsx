import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSentRequests } from '@/hooks/useSentRequests';
import { useRouter } from 'expo-router';
import React, { memo, useCallback } from 'react';

const SentRequestItem = memo(function SentRequestItem({ 
    item, 
    onCancel, 
    onDelete 
}: { 
    item: any, 
    onCancel: (id: string) => void, 
    onDelete: (id: string) => void 
}) {
    return (
        <View style={{
            paddingHorizontal: 16,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#F9FAFB',
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: item.status === 'accepted' ? '#ECFDF5' + '30' :
                item.status === 'rejected' ? '#FEF2F2' + '30' : 'white',
            marginHorizontal: 12,
            marginVertical: 6,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: item.status === 'accepted' ? '#10B981' + '30' :
                item.status === 'rejected' ? '#EF4444' + '30' : '#F3F4F6'
        }}>
            <Image
                source={{ uri: item.receiver?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.receiver?.username || 'User')}&backgroundColor=F68537` }}
                style={{ width: 56, height: 56, borderRadius: 28, marginRight: 16 }}
            />
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1F2937' }}>{item.receiver?.username || 'Unknown User'}</Text>

                {item.status === 'pending' ? (
                    <>
                        <Text style={{ color: '#6B7280', fontSize: 14 }}>Request pending...</Text>
                        <TouchableOpacity
                            onPress={() => onCancel(item.id)}
                            style={{ marginTop: 12, backgroundColor: '#FEE2E2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, alignSelf: 'flex-start' }}
                        >
                            <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Cancel Request</Text>
                        </TouchableOpacity>
                    </>
                ) : item.status === 'accepted' ? (
                    <View style={{ marginTop: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            <Text style={{ color: '#047857', fontWeight: 'bold', fontSize: 14 }}>Accepted</Text>
                            <Text style={{ color: '#6B7280', fontSize: 12 }}> • {new Date(item.updated_at || item.created_at).toLocaleDateString()}</Text>
                        </View>
                        <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start', marginTop: 8 }}>
                            <Text style={{ color: '#065F46', fontSize: 12, fontWeight: '600' }}>Now Friends 🤝</Text>
                        </View>
                    </View>
                ) : (
                    <View style={{ marginTop: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="close-circle" size={16} color="#EF4444" />
                            <Text style={{ color: '#B91C1C', fontWeight: 'bold', fontSize: 14 }}>Rejected</Text>
                            <Text style={{ color: '#6B7280', fontSize: 12 }}> • {new Date(item.updated_at || item.created_at).toLocaleDateString()}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => onDelete(item.id)}
                            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8, gap: 4 }}
                        >
                            <Ionicons name="trash-outline" size={14} color="#4B5563" />
                            <Text style={{ color: '#4B5563', fontSize: 12, fontWeight: 'bold' }}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
});

export default function SentRequestsScreen() {
    const { sentRequests, loading, cancelRequest, deleteRequest, getCounts, refresh } = useSentRequests();
    const router = useRouter();
    const counts = getCounts();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
                    <Ionicons name="arrow-back" size={24} color="#F68537" />
                </TouchableOpacity>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#F68537' }}>Sent Requests</Text>
            </View>

            {/* Stats Cards */}
            <View style={{ padding: 16, backgroundColor: '#FFF5E6', flexDirection: 'row', gap: 8 }}>
                {[
                    { label: 'Pending', count: counts.pending, color: '#3B82F6', bg: '#EFF6FF' },
                    { label: 'Accepted', count: counts.accepted, color: '#10B981', bg: '#ECFDF5' },
                    { label: 'Rejected', count: counts.rejected, color: '#EF4444', bg: '#FEF2F2' },
                    { label: 'Total', count: counts.total, color: '#6B7280', bg: '#F9FAFB' },
                ].map(stat => (
                    <View key={stat.label} style={{ flex: 1, backgroundColor: stat.bg, padding: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: stat.color + '20' }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: stat.color }}>{stat.count}</Text>
                        <Text style={{ fontSize: 10, color: stat.color, fontWeight: '600' }}>{stat.label}</Text>
                    </View>
                ))}
            </View>

            <FlatList
                data={sentRequests}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#F68537" />
                }
                renderItem={({ item }) => (
                    <SentRequestItem 
                        item={item} 
                        onCancel={cancelRequest} 
                        onDelete={deleteRequest} 
                    />
                )}
                ListEmptyComponent={
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 80 }}>
                        <Ionicons name="paper-plane-outline" size={64} color="#CBD5E1" />
                        <Text style={{ color: '#94A3B8', marginTop: 16, textAlign: 'center' }}>No sent requests yet.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
