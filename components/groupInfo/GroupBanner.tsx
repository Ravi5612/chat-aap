import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface GroupBannerProps {
    groupName: string;
    groupImage?: string;
    memberCount: number;
    myRole: 'admin' | 'member';
}

export default function GroupBanner({ groupName, groupImage, memberCount, myRole }: GroupBannerProps) {
    return (
        <View style={styles.groupBanner}>
            <View style={styles.groupAvatarWrapper}>
                <Image
                    source={{
                        uri: groupImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(groupName || 'G')}&backgroundColor=F68537`
                    }}
                    style={styles.groupAvatar}
                    contentFit="cover"
                />
            </View>
            <Text style={styles.groupName}>{groupName}</Text>
            <Text style={styles.memberCount}>{memberCount} member{memberCount !== 1 ? 's' : ''}</Text>
            {myRole === 'admin' && (
                <View style={styles.adminBadge}>
                    <Ionicons name="shield-checkmark" size={14} color="#F68537" />
                    <Text style={styles.adminBadgeText}>You are an Admin</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    groupBanner: {
        alignItems: 'center', 
        paddingVertical: 28, 
        paddingHorizontal: 20,
        backgroundColor: '#FFFDF9',
    },
    groupAvatarWrapper: {
        width: 100, 
        height: 100, 
        borderRadius: 50,
        borderWidth: 3, 
        borderColor: '#F68537',
        overflow: 'hidden', 
        marginBottom: 12,
        shadowColor: '#F68537', 
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, 
        shadowRadius: 8, 
        elevation: 6,
    },
    groupAvatar: { width: '100%', height: '100%' },
    groupName: { fontSize: 22, fontWeight: '800', color: '#1F2937', marginBottom: 4 },
    memberCount: { fontSize: 14, color: '#9CA3AF', fontWeight: '600', marginBottom: 8 },
    adminBadge: {
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 6,
        backgroundColor: '#FFF5E6', 
        paddingHorizontal: 12, 
        paddingVertical: 6,
        borderRadius: 20, 
        borderWidth: 1.5, 
        borderColor: '#F68537',
    },
    adminBadgeText: { fontSize: 13, fontWeight: '700', color: '#F68537' },
});
