import React, { memo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Pressable, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ComponentErrorBoundary } from '@/components/ui/ComponentErrorBoundary';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { sendFriendRequest } from '@/utils/friendRequestHelper';
interface FriendListItemProps {
    friend: any;
    onClick: (friend: any) => void;
    onLongPress?: (friend: any) => void;
    isOnline?: boolean;
    onViewUserStatus?: (friend: any) => void;
    onImageClick?: (friend: any) => void;
    currentUserId?: string;
}

const FriendListItemInner = memo(function FriendListItemInner({ friend, onClick, onLongPress, isOnline, onViewUserStatus, onImageClick, currentUserId }: FriendListItemProps) {
    const router = useRouter();
    const [isSending, setIsSending] = useState(false);
    const [requestSent, setRequestSent] = useState(false);

    const handleAddFriend = useCallback(async (e: any) => {
        e.stopPropagation();
        if (!currentUserId || requestSent || isSending) return;
        
        setIsSending(true);
        try {
            await sendFriendRequest(currentUserId, friend.id);
            setRequestSent(true);
            Alert.alert('Success', 'Friend request sent! ✅');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send request');
        } finally {
            setIsSending(false);
        }
    }, [currentUserId, requestSent, isSending, friend.id]);

    const hasStatus = friend.statusCount > 0;
    const ringColor = hasStatus
        ? (friend.allStatusesViewed ? '#D1D5DB' : '#10B981')
        : 'transparent';

    // Instant press animation via Reanimated purely on UI thread
    const scaleAnim = useSharedValue(1);

    const handlePressIn = useCallback(() => {
        scaleAnim.value = withSpring(0.965, {
            damping: 15,
            stiffness: 300,
        });
    }, [scaleAnim]);

    const handlePressOut = useCallback(() => {
        scaleAnim.value = withSpring(1, {
            damping: 10,
            stiffness: 200,
        });
    }, [scaleAnim]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scaleAnim.value }],
    }));

    const handleItemPress = useCallback(() => {
        onClick(friend);
    }, [onClick, friend]);

    const handleItemLongPress = useCallback(() => {
        if (onLongPress) {
            onLongPress(friend);
        }
    }, [onLongPress, friend]);

    const handleImagePress = useCallback((e: any) => {
        e.stopPropagation();
        if (hasStatus && onViewUserStatus) {
            onViewUserStatus(friend);
        } else if (onImageClick) {
            onImageClick(friend);
        }
    }, [hasStatus, onViewUserStatus, onImageClick, friend]);

    return (
        <Animated.View style={animatedStyle}>
            <TouchableOpacity
                onPress={handleItemPress}
                onLongPress={handleItemLongPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.85}
                style={[
                    styles.itemContainer,
                    friend.isUnfriended ? styles.itemUnfriended : null
                ]}
            >
                <Pressable
                    onPress={handleImagePress}
                    style={({ pressed }) => [styles.avatarPressable, { opacity: pressed ? 0.8 : 1 }]}
                >
                    <Image
                        cachePolicy="memory-disk"
                        source={
                            friend.img 
                                ? (typeof friend.img === 'string' ? { uri: friend.img } : friend.img)
                                : (friend.gender === 'female' 
                                    ? require('@/assets/images/default-avatar-female.jpg') 
                                    : require('@/assets/images/default-avatar-male.jpg'))
                        }
                        style={[
                            styles.avatar,
                            {
                                borderWidth: hasStatus ? 2 : 0,
                                borderColor: ringColor,
                                padding: hasStatus ? 2 : 0
                            }
                        ]}
                    />

                    {isOnline && <View style={styles.onlineDot} />}

                    {hasStatus && !friend.allStatusesViewed && (
                        <View style={styles.statusCountBadge}>
                            <Text style={styles.statusCountText}>{friend.statusCount}</Text>
                        </View>
                    )}
                </Pressable>

                <View style={styles.infoContainer}>
                    <View style={styles.headerRow}>
                        <View style={styles.nameRow}>
                            <Text style={[styles.nameText, (friend.isBlocked || friend.isUnfriended) && styles.nameTextDim]}>
                                {friend.name}
                            </Text>
                            {friend.isBlocked && (
                                <Ionicons name="ban-outline" size={14} color="#EF4444" />
                            )}
                            {friend.isUnfriended && !friend.isBlocked && (
                                <View style={styles.unfriendedBadge}>
                                    <Ionicons name="person-remove" size={10} color="#DC2626" />
                                    <Text style={styles.unfriendedText}>Unfriended</Text>
                                </View>
                            )}
                        </View>
                        {friend.lastMessageTime && (
                            <Text style={styles.timeText}>{friend.lastMessageTime}</Text>
                        )}
                    </View>
                    <View style={styles.subRow}>
                        <Text 
                            style={[
                                styles.messageText, 
                                friend.isTyping && styles.typingText,
                                friend.isUnfriended && !friend.isTyping && styles.unfriendedMsgText
                            ]} 
                            numberOfLines={1}
                        >
                            {friend.isTyping ? 'typing...' : (friend.isUnfriended ? 'Read-only mode. Add friend to chat.' : (friend.lastMessage || friend.email || 'Email hidden'))}
                        </Text>
                        
                        {friend.isUnfriended ? (
                            <Pressable 
                                onPress={handleAddFriend}
                                disabled={requestSent || isSending}
                                style={({pressed}) => [
                                    styles.addFriendBtn,
                                    requestSent ? styles.addFriendSent : styles.addFriendDefault,
                                    { opacity: pressed ? 0.8 : 1 }
                                ]}
                            >
                                {isSending ? (
                                    <ActivityIndicator size="small" color="white" style={styles.addFriendLoader} />
                                ) : (
                                    <Ionicons name={requestSent ? "checkmark-circle" : "person-add"} size={14} color="white" />
                                )}
                                <Text style={styles.addFriendText}>
                                    {requestSent ? 'Sent' : 'Add Friend'}
                                </Text>
                            </Pressable>
                        ) : (
                            friend.unreadCount > 0 && (
                                <View style={styles.unreadBadge}>
                                    <Text style={styles.unreadText}>{friend.unreadCount}</Text>
                                </View>
                            )
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

export default function FriendListItem(props: FriendListItemProps) {
    return (
        <ComponentErrorBoundary fallbackName={`Friend List Item (${props.friend?.name || 'Unknown'})`}>
            <FriendListItemInner {...props} />
        </ComponentErrorBoundary>
    );
}

const styles = StyleSheet.create({
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        width: '100%',
        backgroundColor: 'transparent',
    },
    itemUnfriended: {
        backgroundColor: 'rgba(0,0,0,0.02)',
        opacity: 0.75,
    },
    avatarPressable: {
        position: 'relative',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E5E7EB',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        backgroundColor: '#10B981',
        borderRadius: 7,
        borderWidth: 2,
        borderColor: 'white',
        zIndex: 10
    },
    statusCountBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: '#10B981',
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'white',
        zIndex: 20
    },
    statusCountText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold'
    },
    infoContainer: {
        flex: 1,
        marginLeft: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
        paddingBottom: 12
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    nameText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827'
    },
    nameTextDim: {
        color: '#9CA3AF'
    },
    unfriendedBadge: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FCA5A5',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2
    },
    unfriendedText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#DC2626',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    timeText: {
        fontSize: 12,
        color: '#6B7280'
    },
    subRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4
    },
    messageText: {
        fontSize: 14,
        color: '#4B5563',
        flex: 1,
        marginRight: 8,
        fontStyle: 'normal',
        fontWeight: 'normal'
    },
    typingText: {
        color: '#10B981',
        fontStyle: 'italic',
        fontWeight: 'bold'
    },
    unfriendedMsgText: {
        color: '#9CA3AF',
        fontStyle: 'italic',
    },
    addFriendBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
    },
    addFriendDefault: {
        backgroundColor: '#F68537',
        borderColor: '#EA580C',
        elevation: 4,
        shadowColor: '#F68537',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
    },
    addFriendSent: {
        backgroundColor: '#10B981',
        borderColor: '#059669',
        elevation: 0,
        shadowColor: 'transparent',
    },
    addFriendLoader: {
        width: 14,
        height: 14
    },
    addFriendText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.5
    },
    unreadBadge: {
        backgroundColor: '#F68537',
        borderRadius: 9999,
        paddingHorizontal: 8,
        paddingVertical: 2
    },
    unreadText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold'
    }
});
