import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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

export default function HomeSuggestions({
    showContactSuggestions,
    showNearbySuggestions,
    suggestionTab,
    suggestionsExpanded,
    onSetSuggestionTab,
    onToggleExpanded
}: HomeSuggestionsProps) {
    if (!showContactSuggestions && !showNearbySuggestions) return null;

    return (
        <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap', paddingRight: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: '#64748B', letterSpacing: 0.5 }}>SUGGESTIONS FROM</Text>
                    <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 20, padding: 2 }}>
                        {showContactSuggestions && (
                            <TouchableOpacity
                                onPress={() => onSetSuggestionTab('contacts')}
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 4,
                                    borderRadius: 18,
                                    backgroundColor: suggestionTab === 'contacts' ? '#F68537' : 'transparent'
                                }}
                            >
                                <Text style={{ fontSize: 11, fontWeight: 'bold', color: suggestionTab === 'contacts' ? 'white' : '#64748B' }}>CONTACTS</Text>
                            </TouchableOpacity>
                        )}
                        {showNearbySuggestions && (
                            <TouchableOpacity
                                onPress={() => onSetSuggestionTab('nearby')}
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 4,
                                    borderRadius: 18,
                                    backgroundColor: suggestionTab === 'nearby' ? '#F68537' : 'transparent'
                                }}
                            >
                                <Text style={{ fontSize: 11, fontWeight: 'bold', color: suggestionTab === 'nearby' ? 'white' : '#64748B' }}>NEARBY</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                <TouchableOpacity onPress={onToggleExpanded} style={{ padding: 4 }}>
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
}
