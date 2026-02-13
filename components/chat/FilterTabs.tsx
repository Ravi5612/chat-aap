import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface FilterTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    counts?: { [key: string]: number };
}

export default function FilterTabs({ activeTab, onTabChange, counts = {} }: FilterTabsProps) {
    const tabs = [
        { id: 'all', label: 'All', icon: '💬' },
        { id: 'groups', label: 'Groups', icon: '👨‍👩‍👧‍👦' },
        { id: 'favourites', label: 'Favourites', icon: '⭐' },
        { id: 'archive', label: 'Archive', icon: '📦' },
    ];

    return (
        <View className="bg-white border-b border-gray-100">
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
            >
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.id}
                        onPress={() => onTabChange(tab.id)}
                        className={`
                            flex-row items-center px-4 py-2 rounded-full mr-3 border
                            ${activeTab === tab.id
                                ? 'bg-[#F68537] border-[#F68537]'
                                : 'bg-gray-50 border-gray-100'}
                        `}
                    >
                        <Text className="mr-1.5 text-sm">{tab.icon}</Text>
                        <Text className={`
                            text-sm font-bold
                            ${activeTab === tab.id ? 'text-white' : 'text-gray-600'}
                        `}>
                            {tab.label}
                        </Text>
                        {counts[tab.id] > 0 && (
                            <View className={`
                                ml-1.5 px-1.5 py-0.5 rounded-full
                                ${activeTab === tab.id ? 'bg-white' : 'bg-[#F68537]'}
                            `}>
                                <Text className={`
                                    text-[10px] font-black
                                    ${activeTab === tab.id ? 'text-[#F68537]' : 'text-white'}
                                `}>
                                    {counts[tab.id]}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}
