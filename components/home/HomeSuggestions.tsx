import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ContactSuggestions from '@/components/chat/ContactSuggestions';
import NearbySuggestions from '@/components/chat/NearbySuggestions';

interface HomeSuggestionsProps {
    showContactSuggestions: boolean;
    showNearbySuggestions: boolean;
    suggestionTab: 'contacts' | 'nearby';
    suggestionsExpanded: boolean;
    onSetSuggestionTab: (tab: 'contacts' | 'nearby') => void;
    onToggleExpanded: () => void;
}

const HomeSuggestions = memo(function HomeSuggestions({
    showContactSuggestions,
    showNearbySuggestions,
    suggestionTab,
    suggestionsExpanded,
    onSetSuggestionTab,
    onToggleExpanded
}: HomeSuggestionsProps) {
    
    const handleSetContacts = React.useCallback(() => {
        onSetSuggestionTab('contacts');
    }, [onSetSuggestionTab]);

    const handleSetNearby = React.useCallback(() => {
        onSetSuggestionTab('nearby');
    }, [onSetSuggestionTab]);

    if (!showContactSuggestions && !showNearbySuggestions) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.titleWrap}>
                    <Text 
                        style={styles.titleText} 
                        numberOfLines={1} 
                        adjustsFontSizeToFit
                    >
                        SUGGESTIONS FROM
                    </Text>
                    <View style={styles.tabContainer}>
                        {showContactSuggestions && (
                            <TouchableOpacity
                                onPress={handleSetContacts}
                                style={[
                                    styles.tabBtn,
                                    suggestionTab === 'contacts' ? styles.tabActive : styles.tabInactive
                                ]}
                            >
                                <Text style={[
                                    styles.tabText,
                                    suggestionTab === 'contacts' ? styles.tabTextActive : styles.tabTextInactive
                                ]}>CONTACTS</Text>
                            </TouchableOpacity>
                        )}
                        {showNearbySuggestions && (
                            <TouchableOpacity
                                onPress={handleSetNearby}
                                style={[
                                    styles.tabBtn,
                                    suggestionTab === 'nearby' ? styles.tabActive : styles.tabInactive
                                ]}
                            >
                                <Text style={[
                                    styles.tabText,
                                    suggestionTab === 'nearby' ? styles.tabTextActive : styles.tabTextInactive
                                ]}>NEARBY</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                <TouchableOpacity onPress={onToggleExpanded} style={styles.toggleBtn}>
                    <Ionicons name={suggestionsExpanded ? "chevron-up" : "chevron-down"} size={22} color="#F68537" />
                </TouchableOpacity>
            </View>

            {suggestionsExpanded && (
                suggestionTab === 'contacts' && showContactSuggestions ? (
                    <ContactSuggestions />
                ) : (
                    showNearbySuggestions && <NearbySuggestions />
                )
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        marginTop: 10
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 8
    },
    titleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        paddingRight: 8
    },
    titleText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 0.5,
        flexShrink: 1
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 20,
        padding: 2,
        flexShrink: 0
    },
    tabBtn: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 18
    },
    tabActive: {
        backgroundColor: '#F68537'
    },
    tabInactive: {
        backgroundColor: 'transparent'
    },
    tabText: {
        fontSize: 11,
        fontWeight: 'bold'
    },
    tabTextActive: {
        color: 'white'
    },
    tabTextInactive: {
        color: '#64748B'
    },
    toggleBtn: {
        padding: 4
    }
});

export default HomeSuggestions;
