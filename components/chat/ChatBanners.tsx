import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UnfriendedBannerProps {
    safeFriendId: string;
    onAddFriend: () => void;
}

export function UnfriendedBanner({ safeFriendId, onAddFriend }: UnfriendedBannerProps) {
    return (
        <View style={styles.unfriendedBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="person-remove-outline" size={20} color="#F68537" />
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#C2410C' }}>
                    Tum dono ab friends nahi ho
                </Text>
            </View>
            <Text style={{ fontSize: 12, color: '#9A3412', textAlign: 'center', lineHeight: 18 }}>
                Purani chat pad sakte ho, lekin message karne ke liye pehle friend request bhejna hoga.
            </Text>
            <TouchableOpacity onPress={onAddFriend} style={styles.unfriendButton}>
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 14, letterSpacing: 0.3 }}>
                    👤 Friend Request Bhejna
                </Text>
            </TouchableOpacity>
        </View>
    );
}

interface BlockedBannerProps {
    isBlocked: boolean;
    friendName: string;
    onUnblock: () => void;
}

export function BlockedBanner({ isBlocked, friendName, onUnblock }: BlockedBannerProps) {
    return (
        <View style={styles.blockedBanner}>
            <Text style={{ color: '#6B7280', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                {isBlocked 
                    ? `You have blocked ${friendName}. Unblock to send messages.` 
                    : `You cannot message ${friendName} because they have blocked you.`}
            </Text>
            {isBlocked && (
                <TouchableOpacity onPress={onUnblock} style={styles.unblockButton}>
                    <Text style={{ color: '#F68537', fontWeight: 'bold', fontSize: 12 }}>UNBLOCK</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    unfriendedBanner: {
        marginHorizontal: 12,
        marginBottom: 10,
        borderRadius: 18,
        backgroundColor: '#FFF7ED',
        borderWidth: 1.5,
        borderColor: '#FED7AA',
        padding: 16,
        alignItems: 'center',
        gap: 8,
    },
    unfriendButton: {
        marginTop: 4,
        backgroundColor: '#F68537',
        paddingVertical: 10,
        paddingHorizontal: 28,
        borderRadius: 24,
        elevation: 2,
        shadowColor: '#F68537',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    blockedBanner: {
        padding: 20, 
        backgroundColor: 'white', 
        alignItems: 'center', 
        justifyContent: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6'
    },
    unblockButton: {
        marginTop: 8, 
        paddingVertical: 4, 
        paddingHorizontal: 12, 
        backgroundColor: '#FFF7ED', 
        borderRadius: 8
    }
});
