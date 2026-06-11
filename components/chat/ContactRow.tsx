import React, { useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';

export const ContactRow = memo(({ user, sendRequest, cancelRequest }: { user: any, sendRequest: (id: string) => void, cancelRequest: (id: string) => void }) => {
    const handleCancel = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        cancelRequest(user.id);
    }, [user.id, cancelRequest]);

    const handleAdd = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        sendRequest(user.id);
    }, [user.id, sendRequest]);

    return (
        <View style={styles.userRow}>
            {user.avatar_url ? (
                <Image 
                    source={user.avatar_url} 
                    style={styles.avatar}
                 cachePolicy="memory-disk" />
            ) : (
                <View style={styles.initialsAvatar}>
                    <Text style={styles.initialsText}>
                        {user.username?.substring(0, 2).toUpperCase() || 'UN'}
                    </Text>
                </View>
            )}

            <View style={styles.userInfo}>
                <View style={styles.userDetails}>
                    <Text style={styles.userName}>{user.username}</Text>
                    <Text style={styles.userSubtitle} numberOfLines={1}>
                        From your contacts
                    </Text>
                </View>

                {user.requestStatus === 'pending' ? (
                    <TouchableOpacity onPress={handleCancel} style={[styles.pendingBadge, styles.opacity80]}>
                        <Text style={styles.pendingText}>Pending</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={handleAdd} style={styles.addButton}>
                        <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3F4F6'
    },
    initialsAvatar: {
        width: 48,
        height: 48,
        backgroundColor: '#F68537',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    initialsText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18
    },
    userInfo: {
        flex: 1,
        marginLeft: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    userDetails: {
        flex: 1,
        marginRight: 10
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B'
    },
    userSubtitle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2
    },
    addButton: {
        backgroundColor: '#F68537',
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 10,
    },
    addButtonText: {
        color: 'white',
        fontSize: 13,
        fontWeight: 'bold'
    },
    pendingBadge: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: '#F1F5F9'
    },
    pendingText: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: 'bold'
    },
    opacity80: {
        opacity: 0.8,
    },
});
