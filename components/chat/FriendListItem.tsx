import React, { useRef, memo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, Pressable, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ComponentErrorBoundary } from '@/components/ui/ComponentErrorBoundary';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
interface FriendListItemProps {
    friend: any;
    onClick: (friend: any) => void;
    onLongPress?: (friend: any) => void;
    isOnline?: boolean;
    onViewUserStatus?: (friend: any) => void;
    onImageClick?: (friend: any) => void;
}

const FriendListItemInner = memo(function FriendListItemInner({ friend, onClick, onLongPress, isOnline, onViewUserStatus, onImageClick }: FriendListItemProps) {
    const router = useRouter();
    const currentUser = useAuthStore(state => state.user);
    const [isSending, setIsSending] = useState(false);
    const [requestSent, setRequestSent] = useState(false);

    const handleAddFriend = useCallback(async (e: any) => {
        e.stopPropagation();
        if (!currentUser || requestSent || isSending) return;
        
        setIsSending(true);
        try {
            const { error } = await supabase
                .from('friend_requests')
                .insert([{
                    sender_id: currentUser.id,
                    receiver_id: friend.id,
                    status: 'pending'
                }]);

            if (error) {
                if (error.code === '23505') { // unique violation
                    setRequestSent(true);
                    return;
                }
                throw error;
            }

            const { data: myProfile } = await supabase.from('profiles').select('username').eq('id', currentUser.id).single();

            await supabase.from('notifications').insert([{
                user_id: friend.id,
                sender_id: currentUser.id,
                type: 'friend_request',
                message: `${myProfile?.username || 'Someone'} sent you a friend request.`,
                is_read: false
            }]);

            setRequestSent(true);
            Alert.alert('Success', 'Friend request sent! ✅');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send request');
        } finally {
            setIsSending(false);
        }
    }, [currentUser, requestSent, isSending, friend.id]);

    const hasStatus = friend.statusCount > 0;
    const ringColor = hasStatus
        ? (friend.allStatusesViewed ? '#D1D5DB' : '#10B981')
        : 'transparent';

    // Instant press animation — user immediately sees tap registered
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = useCallback(() => {
        Animated.spring(scaleAnim, {
            toValue: 0.965,
            useNativeDriver: true,
            speed: 60,
            bounciness: 0,
        }).start();
    }, [scaleAnim]);

    const handlePressOut = useCallback(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 25,
            bounciness: 5,
        }).start();
    }, [scaleAnim]);

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
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
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
                    {friend.img ? (
                        <Image
                            source={friend.img}
                            style={[
                                styles.avatar,
                                {
                                    borderWidth: hasStatus ? 2 : 0,
                                    borderColor: ringColor,
                                    padding: hasStatus ? 2 : 0
                                }
                            ]}
                        />
                    ) : null}

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
