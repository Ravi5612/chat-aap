import React, { useRef, memo, useState } from 'react';
import { View, Text, Image, TouchableOpacity, Animated, Pressable, Alert, ActivityIndicator } from 'react-native';
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
    const { user: currentUser } = useAuthStore();
    const [isSending, setIsSending] = useState(false);
    const [requestSent, setRequestSent] = useState(false);

    const handleAddFriend = async (e: any) => {
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
    };

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
                style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    paddingHorizontal: 16, 
                    paddingVertical: 16, 
                    width: '100%',
                    backgroundColor: friend.isUnfriended ? 'rgba(0,0,0,0.02)' : 'transparent',
                    opacity: friend.isUnfriended ? 0.75 : 1
                }}
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
                                <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: '#FCA5A5', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                    <Ionicons name="person-remove" size={10} color="#DC2626" />
                                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#DC2626', textTransform: 'uppercase', letterSpacing: 0.5 }}>Unfriended</Text>
                                </View>
                            )}
                        </View>
                        {friend.lastMessageTime && (
                            <Text style={{ fontSize: 12, color: '#6B7280' }}>{friend.lastMessageTime}</Text>
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                        <Text style={{ fontSize: 14, color: friend.isTyping ? '#10B981' : (friend.isUnfriended ? '#9CA3AF' : '#4B5563'), flex: 1, marginRight: 8, fontStyle: (friend.isTyping || friend.isUnfriended) ? 'italic' : 'normal', fontWeight: friend.isTyping ? 'bold' : 'normal' }} numberOfLines={1}>
                            {friend.isTyping ? 'typing...' : (friend.isUnfriended ? 'Read-only mode. Add friend to chat.' : (friend.lastMessage || friend.email || 'Email hidden'))}
                        </Text>
                        
                        {friend.isUnfriended ? (
                            <Pressable 
                                onPress={handleAddFriend}
                                disabled={requestSent || isSending}
                                style={({pressed}) => ({
                                    backgroundColor: requestSent ? '#10B981' : '#F68537',
                                    paddingHorizontal: 16,
                                    paddingVertical: 8,
                                    borderRadius: 20,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                    opacity: pressed ? 0.8 : 1,
                                    elevation: requestSent ? 0 : 4,
                                    shadowColor: requestSent ? 'transparent' : '#F68537',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.4,
                                    shadowRadius: 6,
                                    borderWidth: 1,
                                    borderColor: requestSent ? '#059669' : '#EA580C',
                                })}
                            >
                                {isSending ? (
                                    <ActivityIndicator size="small" color="white" style={{ width: 14, height: 14 }} />
                                ) : (
                                    <Ionicons name={requestSent ? "checkmark-circle" : "person-add"} size={14} color="white" />
                                )}
                                <Text style={{ color: 'white', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 }}>
                                    {requestSent ? 'Sent' : 'Add Friend'}
                                </Text>
                            </Pressable>
                        ) : (
                            friend.unreadCount > 0 && (
                                <View style={{ backgroundColor: '#F68537', borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 2 }}>
                                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{friend.unreadCount}</Text>
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
