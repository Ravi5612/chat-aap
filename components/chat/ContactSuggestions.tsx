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
                <TouchableOpacity onPress={() => loadSuggestions(true)}>
                    <Ionicons name="refresh" size={16} color="#9CA3AF" />
                </TouchableOpacity>
            </View>

            <View style={{ paddingBottom: 8 }}>
                {suggestions.map((user) => (
                    <View 
                        key={user.id} 
                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, width: '100%' }}
                    >
                        {user.avatar_url ? (
                            <Image 
                                source={{ uri: user.avatar_url }} 
                                style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#E5E7EB' }}
                            />
                        ) : (
                            <View style={{
                                width: 48,
                                height: 48,
                                backgroundColor: '#F68537',
                                borderRadius: 24,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                                    {user.username?.substring(0, 2).toUpperCase() || 'UN'}
                                </Text>
                            </View>
                        )}

                        <View style={{ flex: 1, marginLeft: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 0, 0, 0.05)', paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>{user.username}</Text>
                                <Text style={{ fontSize: 14, color: '#4B5563', marginTop: 2 }} numberOfLines={1}>
                                    From your contacts
                                </Text>
                            </View>

                            {user.requestStatus === 'pending' ? (
                                <View style={{ paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#E5E7EB' }}>
                                    <Text style={{ color: '#6B7280', fontSize: 12, fontWeight: 'bold' }}>Pending</Text>
                                </View>
                            ) : (
                                <TouchableOpacity 
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        sendRequest(user.id);
                                    }}
                                    style={{ 
                                        backgroundColor: '#F68537', 
                                        paddingVertical: 6, 
                                        paddingHorizontal: 16, 
                                        borderRadius: 8,
                                    }}
                                >
                                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Add</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}
