import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Platform, ActivityIndicator } from 'react-native';
import { useContactSuggestions } from '@/hooks/useContactSuggestions';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function ContactSuggestions() {
    const { suggestions, loading, permissionGranted, loadSuggestions, sendRequest } = useContactSuggestions();

    if (permissionGranted === false) {
        return null; // Don't show anything if permission denied, or show a prompt to enable.
    }

    if (loading && suggestions.length === 0) {
        return (
            <View style={{ padding: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 12 }}>Suggested from Contacts</Text>
                <ActivityIndicator color="#F68537" style={{ alignSelf: 'flex-start', marginLeft: 20 }} />
            </View>
        );
    }

    if (suggestions.length === 0) {
        return null; // Hide section if no suggestions
    }

    return (
        <View style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Suggested from Contacts</Text>
                <TouchableOpacity onPress={() => loadSuggestions()}>
                    <Ionicons name="refresh" size={16} color="#9CA3AF" />
                </TouchableOpacity>
            </View>

            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 12, gap: 12 }}
            >
                {suggestions.map((user) => (
                    <View 
                        key={user.id} 
                        style={{ 
                            width: 120, 
                            backgroundColor: 'white', 
                            borderRadius: 16, 
                            padding: 12,
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.05,
                            shadowRadius: 5,
                            elevation: 2
                        }}
                    >
                        <Image 
                            source={{ uri: user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username || 'User')}&backgroundColor=F68537` }} 
                            style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 8 }}
                        />
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1F2937', marginBottom: 2, textAlign: 'center' }} numberOfLines={1}>
                            {user.username}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 12, textAlign: 'center' }} numberOfLines={1}>
                            In your contacts
                        </Text>

                        <TouchableOpacity 
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                sendRequest(user.id);
                            }}
                            style={{ 
                                backgroundColor: '#F68537', 
                                paddingVertical: 6, 
                                paddingHorizontal: 20, 
                                borderRadius: 9999,
                                width: '100%',
                                alignItems: 'center'
                            }}
                        >
                            <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Add</Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}
