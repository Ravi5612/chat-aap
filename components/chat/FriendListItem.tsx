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
            onPress={() => onClick(friend)}
            className="flex-row items-center px-4 py-3 active:bg-gray-100"
        >
            <View className="relative">
                <Image
                    source={{ uri: friend.img || 'https://via.placeholder.com/150' }}
                    className="w-12 h-12 rounded-full bg-gray-200"
                />
                {isOnline && (
                    <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                )}
                {friend.statusCount > 0 && !friend.allStatusesViewed && (
                    <View className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-5 h-5 items-center justify-center border-2 border-white">
                        <Text className="text-white text-[10px] font-bold">{friend.statusCount}</Text>
                    </View>
                )}
            </View>

            <View className="flex-1 ml-3 border-b border-gray-100 pb-3">
                <View className="flex-row justify-between items-center">
                    <Text className="text-base font-semibold text-gray-900">{friend.name}</Text>
                    {friend.lastMessageTime && (
                        <Text className="text-xs text-gray-400">{friend.lastMessageTime}</Text>
                    )}
                </View>
                <View className="flex-row justify-between items-center mt-1">
                    <Text className="text-sm text-gray-500 truncate flex-1 mr-2" numberOfLines={1}>
                        {friend.lastMessage || friend.email || 'No messages yet'}
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
