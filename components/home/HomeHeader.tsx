import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY_COLOR, SECONDARY_COLOR } from '@/constants/Colors';
import { GlassHeader } from '@/components/ui/GlassHeader';
import { useRouter } from 'expo-router';

interface HomeHeaderProps {
    profile: any;
    pendingSentCount: number;
    pendingReceivedCount: number;
    unreadNotificationsCount: number;
}

import { useColorScheme } from '@/hooks/use-color-scheme';

const HomeHeader = memo(function HomeHeader({
    profile,
    pendingSentCount,
    pendingReceivedCount,
    unreadNotificationsCount
}: HomeHeaderProps) {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const IS_ANDROID = Platform.OS === 'android';
    const THEME_COLOR = '#F68537';
    const PRIMARY_COLOR = IS_ANDROID ? (isDark ? '#E5E7EB' : 'white') : THEME_COLOR;
    const SECONDARY_COLOR = IS_ANDROID ? THEME_COLOR : (isDark ? '#111827' : 'white');

    const handleProfile = React.useCallback(() => router.push('/(tabs)/profile' as any), [router]);
    const handleSearch = React.useCallback(() => router.push('/search' as any), [router]);
    const handleSentRequests = React.useCallback(() => router.push('/sent-requests' as any), [router]);
    const handleFriendRequests = React.useCallback(() => router.push('/friend-requests' as any), [router]);
    const handleNotifications = React.useCallback(() => router.push('/notifications' as any), [router]);
    
    // Determine the avatar source
    let avatarSource;
    if (profile?.avatar_url) {
        avatarSource = typeof profile.avatar_url === 'string' ? { uri: profile.avatar_url } : profile.avatar_url;
    } else if (profile?.gender === 'female') {
        avatarSource = require('@/assets/images/default-avatar-female.jpg');
    } else {
        // Default to male/other icon if not female or not specified
        avatarSource = require('@/assets/images/default-avatar-male.jpg');
    }

    return (
        <GlassHeader>
            <View style={styles.leftContainer}>
                <TouchableOpacity onPress={handleProfile}>
                    <Image
                        source={avatarSource}
                        style={styles.avatar}
                        cachePolicy="memory-disk"
                    />
                </TouchableOpacity>
                <Text style={styles.usernameText}>
                    {profile?.username || 'user'}
                </Text>
            </View>

            <View style={styles.rightContainer}>
                {/* Search Button */}
                <TouchableOpacity
                    onPress={handleSearch}
                    style={styles.searchBtn}
                >
                    <Text style={styles.searchText}>SEARCH</Text>
                    <View style={styles.searchIconWrap}>
                        <Ionicons name="search" size={12} color={PRIMARY_COLOR} />
                    </View>
                </TouchableOpacity>

                {/* Sent Requests */}
                <TouchableOpacity onPress={handleSentRequests} style={styles.iconBtn}>
                    <Ionicons name="paper-plane-outline" size={26} color={PRIMARY_COLOR} />
                    {pendingSentCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{pendingSentCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Received Friend Requests */}
                <TouchableOpacity onPress={handleFriendRequests} style={styles.iconBtn}>
                    <Ionicons name="people-outline" size={26} color={PRIMARY_COLOR} />
                    {pendingReceivedCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{pendingReceivedCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Notifications */}
                <TouchableOpacity onPress={handleNotifications} style={styles.iconBtn}>
                    <Ionicons name="notifications-outline" size={26} color={PRIMARY_COLOR} />
                    {unreadNotificationsCount > 0 && (
                        <View style={styles.notifBadge}>
                            <Text style={styles.badgeText}>{unreadNotificationsCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </GlassHeader>
    );
});

const styles = StyleSheet.create({
    leftContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: PRIMARY_COLOR
    },
    usernameText: {
        color: PRIMARY_COLOR,
        fontWeight: 'bold',
        fontSize: 18,
        textTransform: 'lowercase'
    },
    rightContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    searchBtn: {
        backgroundColor: PRIMARY_COLOR,
        borderRadius: 9999,
        paddingLeft: 10,
        paddingRight: 4,
        paddingVertical: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    searchText: {
        color: SECONDARY_COLOR,
        fontWeight: '900',
        fontSize: 9,
        letterSpacing: -0.5
    },
    searchIconWrap: {
        backgroundColor: SECONDARY_COLOR,
        padding: 4,
        borderRadius: 9999
    },
    iconBtn: { position: 'relative' },
    badge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#EF4444',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1,
        borderColor: PRIMARY_COLOR
    },
    notifBadge: {
        backgroundColor: '#EF4444',
        borderRadius: 10,
        paddingHorizontal: 5,
        paddingVertical: 1,
        position: 'absolute',
        top: -5,
        right: -10
    },
    badgeText: {
        color: 'white',
        fontSize: 9,
        fontWeight: 'bold'
    }
});

export default HomeHeader;
