import React, { useRef, memo } from 'react';
import { View, Text, Image, TouchableOpacity, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FriendListItemProps {
    friend: any;
    onClick: (friend: any) => void;
    onLongPress?: (friend: any) => void;
    isOnline?: boolean;
    onViewUserStatus?: (friend: any) => void;
    onImageClick?: (friend: any) => void;
}

const FriendListItem = memo(function FriendListItem({ friend, onClick, onLongPress, isOnline, onViewUserStatus, onImageClick }: FriendListItemProps) {
    const hasStatus = friend.statusCount > 0;
    const ringColor = hasStatus
        ? (friend.allStatusesViewed ? '#D1D5DB' : '#10B981')
        : 'transparent';

    // Instant press animation — user immediately sees tap registered
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.965,
            useNativeDriver: true,
            speed: 60,
            bounciness: 0,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 25,
            bounciness: 5,
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                onPress={() => {
                    onClick(friend);
                }}
                onLongPress={() => {
                    if (onLongPress) {
                        onLongPress(friend);
                    }
                }}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.85}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, width: '100%' }}
            >
                <Pressable
                    onPress={(e) => {
                        e.stopPropagation();
                        if (hasStatus && onViewUserStatus) {
                            onViewUserStatus(friend);
                        } else if (onImageClick) {
                            onImageClick(friend);
                        }
                    }}
                    style={({ pressed }) => ({ position: 'relative', opacity: pressed ? 0.8 : 1 })}
                >
                    {friend.img ? (
                        <Image
                            source={{ uri: friend.img }}
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: '#E5E7EB',
                                borderWidth: hasStatus ? 2 : 0,
                                borderColor: ringColor,
                                padding: hasStatus ? 2 : 0
                            }}
                        />
                    ) : (
                        <View style={{
                            width: 48,
                            height: 48,
                            backgroundColor: '#F68537',
                            borderRadius: 16,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: hasStatus ? 2 : 0,
                            borderColor: ringColor
                        }}>
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                                {friend.name?.substring(0, 2).toUpperCase() || 'UN'}
                            </Text>
                        </View>
                    )}

                    {isOnline && (
                        <View style={{
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
                        }} />
                    )}

                    {hasStatus && !friend.allStatusesViewed && (
                        <View style={{
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
                        }}>
                            <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{friend.statusCount}</Text>
                        </View>
                    )}
                </Pressable>

                <View style={{ flex: 1, marginLeft: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 0, 0, 0.05)', paddingBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: (friend.isBlocked || friend.isUnfriended) ? '#9CA3AF' : '#111827' }}>{friend.name}</Text>
                            {friend.isBlocked && (
                                <Ionicons name="ban-outline" size={14} color="#EF4444" />
                            )}
                            {friend.isUnfriended && !friend.isBlocked && (
                                <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 }}>Unfriended</Text>
                                </View>
                            )}
                        </View>
                        {friend.lastMessageTime && (
                            <Text style={{ fontSize: 12, color: '#6B7280' }}>{friend.lastMessageTime}</Text>
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                        <Text style={{ fontSize: 14, color: friend.isTyping ? '#10B981' : (friend.isUnfriended ? '#9CA3AF' : '#4B5563'), flex: 1, marginRight: 8, fontStyle: (friend.isTyping || friend.isUnfriended) ? 'italic' : 'normal', fontWeight: friend.isTyping ? 'bold' : 'normal' }} numberOfLines={1}>
                            {friend.isTyping ? 'typing...' : (friend.isUnfriended ? '🔒 Friend request bhejna hoga' : (friend.lastMessage || friend.email || 'Email hidden'))}
                        </Text>
                        {friend.unreadCount > 0 && !friend.isUnfriended && (
                            <View style={{ backgroundColor: '#F68537', borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 2 }}>
                                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{friend.unreadCount}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

export default FriendListItem;
