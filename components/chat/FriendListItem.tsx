import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';

interface FriendListItemProps {
    friend: any;
    onClick: (friend: any) => void;
    isOnline?: boolean;
}

export default function FriendListItem({ friend, onClick, isOnline }: FriendListItemProps) {
    return (
        <TouchableOpacity
            onPress={() => {
                console.log('Friend clicked:', friend.name);
                onClick(friend);
            }}
            activeOpacity={0.7}
            className="flex-row items-center px-4 py-4"
            style={{ width: '100%' }}
        >
            <View className="relative">
                {friend.img ? (
                    <Image
                        source={{ uri: friend.img }}
                        className="w-12 h-12 rounded-full bg-gray-200"
                    />
                ) : (
                    <View className="w-12 h-12 bg-[#F68537] rounded-2xl items-center justify-center">
                        <Text className="text-white font-bold text-lg">
                            {friend.name?.substring(0, 2).toUpperCase() || 'UN'}
                        </Text>
                    </View>
                )}

                {isOnline && (
                    <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#EBD8B7] rounded-full" />
                )}
            </View>

            <View className="flex-1 ml-4 border-b border-black/5 pb-3">
                <View className="flex-row justify-between items-center">
                    <Text className="text-base font-bold text-gray-900">{friend.name}</Text>
                    {friend.lastMessageTime && (
                        <Text className="text-xs text-gray-500">{friend.lastMessageTime}</Text>
                    )}
                </View>
                <View className="flex-row justify-between items-center mt-1">
                    <Text className="text-sm text-gray-600 truncate flex-1 mr-2" numberOfLines={1}>
                        {friend.lastMessage || friend.email || 'Email hidden'}
                    </Text>
                    {friend.unreadCount > 0 && (
                        <View className="bg-[#F68537] rounded-full px-2 py-0.5">
                            <Text className="text-white text-[10px] font-bold">{friend.unreadCount}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}
