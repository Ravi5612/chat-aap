import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, LayoutAnimation, Platform, UIManager, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useContactSuggestions } from '@/hooks/useContactSuggestions';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ComponentErrorBoundary } from '@/components/ui/ComponentErrorBoundary';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

function ContactSuggestionsInner() {
    const { suggestions, loading, permissionGranted, loadSuggestions, sendRequest, cancelRequest } = useContactSuggestions();

    if (permissionGranted === false) {
        return (
            <View style={styles.container}>
                <View style={styles.emptyCard}>
                    <View style={styles.emptyIconCircle}>
                        <Ionicons name="people-outline" size={32} color="#F68537" />
                    </View>
                    <Text style={styles.emptyTitle}>Contacts Not Synced</Text>
                    <Text style={styles.emptyText}>
                        Aapke doston ko dhoondhne ke liye Contacts permission allow karein.
                    </Text>
                </View>
            </View>
        );
    }

    if (!loading && suggestions.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.emptyCard}>
                    <View style={styles.emptyIconCircle}>
                        <Ionicons name="book-outline" size={32} color="#F68537" />
                    </View>
                    <Text style={styles.emptyTitle}>No Contacts Found</Text>
                    <Text style={styles.emptyText}>
                        Aapke phone contacts mein se abhi tak kisi ne app join nahi kiya hai. Apne doston ko invite karein!
                    </Text>
                </View>
            </View>
        );
    }

    if (loading && suggestions.length === 0) {
        return (
            <View style={{ padding: 16 }}>
                <ActivityIndicator color="#F68537" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.listWrapper}>
                <View style={styles.listView}>
                    {suggestions.map((user) => (
                        <View 
                            key={user.id} 
                            style={styles.userRow}
                        >
                            {user.avatar_url ? (
                                <Image 
                                    source={user.avatar_url} 
                                    style={styles.avatar}
                                    transition={200}
                                />
                            ) : (
                                <View style={styles.initialsAvatar}>
                                    <Text style={styles.initialsText}>
                                        {user.username?.substring(0, 2).toUpperCase() || 'UN'}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.userInfo}>
                                <View style={styles.userDetails}>
                                    <Text style={styles.userName}>{user.username}</Text>
                                    <Text style={styles.userSubtitle} numberOfLines={1}>
                                        From your contacts
                                    </Text>
                                </View>

                                {user.requestStatus === 'pending' ? (
                                    <TouchableOpacity 
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            cancelRequest(user.id);
                                        }}
                                        style={[styles.pendingBadge, { opacity: 0.8 }]}
                                    >
                                        <Text style={styles.pendingText}>Pending</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity 
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            sendRequest(user.id);
                                        }}
                                        style={styles.addButton}
                                    >
                                        <Text style={styles.addButtonText}>Add</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        marginHorizontal: 16,
        marginTop: 10,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFF7ED',
        alignItems: 'center',
        justifyContent: 'center'
    },
    headerText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#1E293B',
        letterSpacing: 0.2
    },
    badge: {
        backgroundColor: '#F68537',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold'
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    listWrapper: {
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)'
    },
    listView: {
        paddingBottom: 8
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3F4F6'
    },
    initialsAvatar: {
        width: 48,
        height: 48,
        backgroundColor: '#F68537',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    initialsText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18
    },
    userInfo: {
        flex: 1,
        marginLeft: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    userDetails: {
        flex: 1,
        marginRight: 10
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B'
    },
    userSubtitle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2
    },
    addButton: {
        backgroundColor: '#F68537',
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 10,
    },
    addButtonText: {
        color: 'white',
        fontSize: 13,
        fontWeight: 'bold'
    },
    pendingBadge: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: '#F1F5F9'
    },
    pendingText: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: 'bold'
    },
    emptyCard: {
        backgroundColor: 'white',
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFF7ED',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 6,
    },
    emptyText: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 19,
        paddingHorizontal: 10,
    }
});

export default function ContactSuggestions() {
    return (
        <ComponentErrorBoundary fallbackName="Contact Suggestions">
            <ContactSuggestionsInner />
        </ComponentErrorBoundary>
    );
}
