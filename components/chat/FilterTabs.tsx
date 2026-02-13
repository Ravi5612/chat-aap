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
        <View style={{ backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
            >
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.id}
                        onPress={() => onTabChange(tab.id)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 9999,
                            marginRight: 12,
                            borderWidth: 1,
                            backgroundColor: activeTab === tab.id ? '#F68537' : '#F9FAFB',
                            borderColor: activeTab === tab.id ? '#F68537' : '#F3F4F6',
                        }}
                    >
                        <Text style={{ marginRight: 6, fontSize: 14 }}>{tab.icon}</Text>
                        <Text style={{
                            fontSize: 14,
                            fontWeight: 'bold',
                            color: activeTab === tab.id ? 'white' : '#4B5563',
                        }}>
                            {tab.label}
                        </Text>
                        {counts[tab.id] > 0 && (
                            <View style={{
                                marginLeft: 6,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 9999,
                                backgroundColor: activeTab === tab.id ? 'white' : '#F68537',
                            }}>
                                <Text style={{
                                    fontSize: 10,
                                    fontWeight: '900',
                                    color: activeTab === tab.id ? '#F68537' : 'white',
                                }}>
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
