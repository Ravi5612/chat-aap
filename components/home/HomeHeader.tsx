import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { GlassHeader } from '@/components/ui/GlassHeader';
import { useRouter } from 'expo-router';

interface HomeHeaderProps {
    profile: any;
    pendingSentCount: number;
    pendingReceivedCount: number;
    unreadNotificationsCount: number;
}

export default function HomeHeader({
    profile,
    pendingSentCount,
    pendingReceivedCount,
    unreadNotificationsCount
}: HomeHeaderProps) {
    const router = useRouter();

    return (
        <GlassHeader>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity onPress={() => router.push('/(tabs)/profile' as any)}>
                    <Image
                        source={{ uri: profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile?.username || 'User')}&backgroundColor=F68537` }}
                        style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: Platform.OS === 'android' ? 'white' : '#F68537' }}
                    />
                </TouchableOpacity>
                <Text style={{
                    color: Platform.OS === 'android' ? 'white' : '#F68537',
                    fontWeight: 'bold',
                    fontSize: 18,
                    textTransform: 'lowercase'
                }}>{profile?.username || 'user'}</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {/* Search Button */}
                <TouchableOpacity
                    onPress={() => {
                        router.push('/search' as any);
                    }}
                    style={{
                        backgroundColor: Platform.OS === 'android' ? 'white' : '#F68537',
                        borderRadius: 9999,
                        paddingLeft: 10,
                        paddingRight: 4,
                        paddingVertical: 4,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4
                    }}
                >
                    <Text style={{
                        color: Platform.OS === 'android' ? '#F68537' : 'white',
                        fontWeight: '900',
                        fontSize: 9,
                        letterSpacing: -0.5
                    }}>SEARCH</Text>
                    <View style={{ backgroundColor: Platform.OS === 'android' ? '#F68537' : 'white', padding: 4, borderRadius: 9999 }}>
                        <Ionicons name="search" size={12} color={Platform.OS === 'android' ? 'white' : '#F68537'} />
                    </View>
                </TouchableOpacity>

                {/* Sent Requests */}
                <TouchableOpacity
                    onPress={() => {
                        router.push('/sent-requests' as any);
                    }}
                    style={{ position: 'relative' }}
                >
                    <Ionicons name="paper-plane-outline" size={26} color={Platform.OS === 'android' ? 'white' : '#F68537'} />
                    {pendingSentCount > 0 && (
                        <View style={{ position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 1, borderColor: Platform.OS === 'android' ? '#F68537' : 'white' }}>
                            <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>{pendingSentCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Received Friend Requests */}
                <TouchableOpacity
                    onPress={() => {
                        router.push('/friend-requests' as any);
                    }}
                    style={{ position: 'relative' }}
                >
                    <Ionicons name="people-outline" size={26} color={Platform.OS === 'android' ? 'white' : '#F68537'} />
                    {pendingReceivedCount > 0 && (
                        <View style={{ position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 1, borderColor: Platform.OS === 'android' ? '#F68537' : 'white' }}>
                            <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>{pendingReceivedCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Notifications */}
                <TouchableOpacity
                    onPress={() => {
                        router.push('/notifications' as any);
                    }}
                    style={{ position: 'relative' }}
                >
                    <Ionicons name="notifications-outline" size={26} color={Platform.OS === 'android' ? 'white' : '#F68537'} />
                    {unreadNotificationsCount > 0 && (
                        <View style={{ backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1, position: 'absolute', top: -5, right: -10 }}>
                            <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>{unreadNotificationsCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </GlassHeader>
    );
}
