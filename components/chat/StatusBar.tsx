import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatusBarProps {
    myStatuses: any;
    friendsWithStatus: any[];
    onAddClick: () => void;
    onViewStatus: (item: any) => void;
    onViewMyStatus: () => void;
}

export default function StatusBar({
    myStatuses,
    friendsWithStatus,
    onAddClick,
    onViewStatus,
    onViewMyStatus
}: StatusBarProps) {
    return (
        <View className="bg-white border-b border-gray-50 py-4">
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}
            >
                {/* 1. Add Status Button */}
                <View className="items-center mr-6">
                    <TouchableOpacity
                        onPress={onAddClick}
                        className="w-16 h-16 rounded-full border-2 border-dashed border-[#F68537] items-center justify-center bg-orange-50"
                    >
                        <Ionicons name="add" size={32} color="#F68537" />
                    </TouchableOpacity>
                    <Text className="text-[10px] font-bold text-gray-400 mt-2 uppercase">Add New</Text>
                </View>

                {/* 2. My Status Bundle (if active) */}
                {myStatuses?.active?.length > 0 && (
                    <View className="items-center mr-6">
                        <TouchableOpacity
                            onPress={onViewMyStatus}
                            className="w-16 h-16 rounded-full p-1 border-2 border-[#F68537]"
                        >
                            <View className="w-full h-full rounded-full overflow-hidden bg-gray-100 items-center justify-center">
                                {myStatuses.active[0].media_type === 'text' ? (
                                    <View className="w-full h-full items-center justify-center" style={{ backgroundColor: myStatuses.active[0].background_color || '#F68537' }}>
                                        <Text className="text-white font-bold">{myStatuses.active[0].content?.charAt(0)}</Text>
                                    </View>
                                ) : (
                                    <Image source={{ uri: myStatuses.active[0].media_url }} className="w-full h-full" />
                                )}
                            </View>
                            <View className="absolute -top-1 -right-1 bg-[#F68537] rounded-full w-5 h-5 items-center justify-center border-2 border-white">
                                <Text className="text-white text-[10px] font-bold">{myStatuses.active.length}</Text>
                            </View>
                        </TouchableOpacity>
                        <Text className="text-[10px] font-bold text-[#F68537] mt-2 uppercase">My Status</Text>
                    </View>
                )}

                {/* 3. Divider */}
                {(friendsWithStatus.length > 0) && (
                    <View className="w-px h-10 bg-gray-200 mr-6" />
                )}

                {/* 4. Friends Statuses */}
                {friendsWithStatus.map((item) => (
                    <View key={item.id} className="items-center mr-6">
                        <TouchableOpacity
                            onPress={() => onViewStatus(item)}
                            className={`w-16 h-16 rounded-full p-1 border-2 ${item.allStatusesViewed ? 'border-gray-200' : 'border-[#25D366]'}`}
                        >
                            <Image
                                source={{ uri: item.img || 'https://via.placeholder.com/150' }}
                                className="w-full h-full rounded-full"
                            />
                        </TouchableOpacity>
                        <Text className="text-[10px] font-bold text-gray-500 mt-2 uppercase max-w-[64px]" numberOfLines={1}>
                            {item.name}
                        </Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}
