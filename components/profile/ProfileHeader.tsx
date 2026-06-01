import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface ProfileHeaderProps {
    avatarUrl: string | null | undefined;
    fullName: string;
    bio: string | null | undefined;
}

export default function ProfileHeader({ avatarUrl, fullName, bio }: ProfileHeaderProps) {
    return (
        <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
                <View style={styles.avatarOuterRing}>
                    <Image
                        source={avatarUrl ? { uri: avatarUrl } : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}&backgroundColor=F68537`}
                        style={styles.avatar}
                        contentFit="cover"
                        transition={500}
                    />
                </View>
                <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark" size={12} color="white" />
                </View>
            </View>

            <View style={{ alignItems: 'center', marginTop: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.name}>{fullName}</Text>
                    <Text style={{ fontSize: 22, marginLeft: 4 }}>🚩</Text>
                </View>
                <Text style={styles.bio}>
                    {bio ? `"${bio}"` : 'No bio set yet.'}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    profileHeader: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatarOuterRing: {
        padding: 4,
        borderRadius: 80,
        borderWidth: 2,
        borderColor: '#FFEEDD',
    },
    avatar: {
        width: 130,
        height: 130,
        borderRadius: 65,
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: '#F68537',
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 3,
        borderColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    occupation: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#F68537',
        marginTop: 4,
        letterSpacing: 1.2,
    },
    bio: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginHorizontal: 40,
        marginTop: 12,
        fontStyle: 'italic',
        lineHeight: 20,
    },
});
