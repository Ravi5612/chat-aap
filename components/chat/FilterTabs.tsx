import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FilterTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    counts?: { [key: string]: number };
    onSearchChange?: (query: string) => void;
}

export default function FilterTabs({ activeTab, onTabChange, counts = {}, onSearchChange }: FilterTabsProps) {
    const [isSearching, setIsSearching] = useState(false);
    const [localQuery, setLocalQuery] = useState('');

    const tabs = [
        { id: 'all', label: 'All', icon: '💬' },
        { id: 'groups', label: 'Groups', icon: '👨‍👩‍👧‍👦' },
        { id: 'favourites', label: 'Favourites', icon: '⭐' },
        { id: 'archive', label: 'Archive', icon: '📦' },
    ];

    const handleSearch = (text: string) => {
        setLocalQuery(text);
        onSearchChange?.(text);
    };

    const toggleSearch = () => {
        if (isSearching) {
            setLocalQuery('');
            onSearchChange?.('');
        }
        setIsSearching(!isSearching);
    };

    return (
        <View style={{ backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
                >
                    {tabs.map((tab) => (
                        <TouchableOpacity
                            key={tab.id}
                            onPress={() => {
                                onTabChange(tab.id);
                                if (isSearching) {
                                    setIsSearching(false);
                                    setLocalQuery('');
                                    onSearchChange?.('');
                                }
                            }}
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

                {/* Search Toggle Button */}
                <TouchableOpacity
                    onPress={toggleSearch}
                    style={{
                        padding: 12,
                        borderLeftWidth: 1,
                        borderLeftColor: '#F3F4F6',
                        backgroundColor: isSearching ? '#FFF3E0' : 'transparent',
                    }}
                >
                    <Ionicons
                        name={isSearching ? "close" : "search"}
                        size={20}
                        color={isSearching ? "#F68537" : "#9CA3AF"}
                    />
                </TouchableOpacity>
            </View>

            {/* Inline Search Bar */}
            {isSearching && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4 }}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#F9FAFB',
                        borderRadius: 9999,
                        paddingHorizontal: 16,
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                    }}>
                        <Ionicons name="search" size={16} color="#9CA3AF" />
                        <TextInput
                            value={localQuery}
                            onChangeText={handleSearch}
                            placeholder={`Search in ${activeTab}...`}
                            style={{
                                flex: 1,
                                height: 40,
                                marginLeft: 8,
                                fontSize: 14,
                                color: '#1F2937',
                            }}
                        />
                    </View>
                </View>
            )}
        </View>
    );
}
