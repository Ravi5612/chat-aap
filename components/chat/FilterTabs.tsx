import React, { useState, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FilterTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    counts?: { [key: string]: number };
    onSearchChange?: (query: string) => void;
}

const TABS = [
    { id: 'all', label: 'All', icon: '💬' },
    { id: 'friends', label: 'Friends', icon: '👥' },
    { id: 'groups', label: 'Groups', icon: '👨‍👩‍👧‍👦' },
    { id: 'favourites', label: 'Favourites', icon: '⭐' },
    { id: 'archive', label: 'Archive', icon: '📦' },
    { id: 'locked', label: 'Locked', icon: '🔒' },
];

// ─── Memoized Tab Item ────────────────────────────────────────────────────────
const FilterTabItem = memo(({ 
    tab, 
    isActive, 
    count, 
    onPress 
}: { 
    tab: any; 
    isActive: boolean; 
    count: number; 
    onPress: (id: string) => void;
}) => {
    const handlePress = useCallback(() => {
        onPress(tab.id);
    }, [tab.id, onPress]);

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={[
                styles.tabItem,
                isActive ? styles.tabItemActive : styles.tabItemInactive
            ]}
        >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[
                styles.tabLabel,
                isActive ? styles.tabLabelActive : styles.tabLabelInactive
            ]}>
                {tab.label}
            </Text>
            {count > 0 && (
                <View style={[
                    styles.badge,
                    isActive ? styles.badgeActive : styles.badgeInactive
                ]}>
                    <Text style={[
                        styles.badgeText,
                        isActive ? styles.badgeTextActive : styles.badgeTextInactive
                    ]}>
                        {count}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
});

const FilterTabs = memo(({ activeTab, onTabChange, counts = {}, onSearchChange }: FilterTabsProps) => {
    const [isSearching, setIsSearching] = useState(false);
    const [localQuery, setLocalQuery] = useState('');

    const handleSearch = useCallback((text: string) => {
        setLocalQuery(text);
        onSearchChange?.(text);
    }, [onSearchChange]);

    const toggleSearch = useCallback(() => {
        if (isSearching) {
            setLocalQuery('');
            onSearchChange?.('');
        }
        setIsSearching(prev => !prev);
    }, [isSearching, onSearchChange]);

    const handleTabPress = useCallback((id: string) => {
        onTabChange(id);
        if (isSearching) {
            setIsSearching(false);
            setLocalQuery('');
            onSearchChange?.('');
        }
    }, [isSearching, onTabChange, onSearchChange]);

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {TABS.map((tab) => (
                        <FilterTabItem
                            key={tab.id}
                            tab={tab}
                            isActive={activeTab === tab.id}
                            count={counts[tab.id] || 0}
                            onPress={handleTabPress}
                        />
                    ))}
                </ScrollView>

                {/* Search Toggle Button */}
                <TouchableOpacity
                    onPress={toggleSearch}
                    style={[
                        styles.searchToggle,
                        isSearching ? styles.searchToggleActive : styles.searchToggleInactive
                    ]}
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
                <View style={styles.searchBarContainer}>
                    <View style={styles.searchBarInner}>
                        <Ionicons name="search" size={16} color="#9CA3AF" />
                        <TextInput
                            value={localQuery}
                            onChangeText={handleSearch}
                            placeholder={`Search in ${activeTab}...`}
                            style={styles.searchInput}
                            autoFocus={true}
                        />
                    </View>
                </View>
            )}
        </View>
    );
});

export default FilterTabs;

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    tabItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 9999,
        marginRight: 12,
        borderWidth: 1,
    },
    tabItemActive: {
        backgroundColor: '#F68537',
        borderColor: '#F68537',
    },
    tabItemInactive: {
        backgroundColor: '#F9FAFB',
        borderColor: '#F3F4F6',
    },
    tabIcon: {
        marginRight: 6,
        fontSize: 14,
    },
    tabLabel: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    tabLabelActive: {
        color: 'white',
    },
    tabLabelInactive: {
        color: '#4B5563',
    },
    badge: {
        marginLeft: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 9999,
    },
    badgeActive: {
        backgroundColor: 'white',
    },
    badgeInactive: {
        backgroundColor: '#F68537',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '900',
    },
    badgeTextActive: {
        color: '#F68537',
    },
    badgeTextInactive: {
        color: 'white',
    },
    searchToggle: {
        padding: 12,
        borderLeftWidth: 1,
        borderLeftColor: '#F3F4F6',
    },
    searchToggleActive: {
        backgroundColor: '#FFF3E0',
    },
    searchToggleInactive: {
        backgroundColor: 'transparent',
    },
    searchBarContainer: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        paddingTop: 4,
    },
    searchBarInner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 9999,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchInput: {
        flex: 1,
        height: 40,
        marginLeft: 8,
        fontSize: 14,
        color: '#1F2937',
    },
});
