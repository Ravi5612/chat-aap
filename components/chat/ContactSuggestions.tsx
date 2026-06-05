import React, { useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Image } from 'expo-image';
import { useContactSuggestions } from '@/hooks/useContactSuggestions';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ComponentErrorBoundary } from '@/components/ui/ComponentErrorBoundary';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Extracted to prevent re-rendering all rows and blinking images
const ContactRow = memo(({ user, sendRequest, cancelRequest }: { user: any, sendRequest: (id: string) => void, cancelRequest: (id: string) => void }) => {
    const handleCancel = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        cancelRequest(user.id);
    }, [user.id, cancelRequest]);

    const handleAdd = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        sendRequest(user.id);
    }, [user.id, sendRequest]);

    return (
        <View style={styles.userRow}>
            {user.avatar_url ? (
                <Image 
                    source={user.avatar_url} 
                    style={styles.avatar}
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
                    <TouchableOpacity onPress={handleCancel} style={[styles.pendingBadge, styles.opacity80]}>
                        <Text style={styles.pendingText}>Pending</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={handleAdd} style={styles.addButton}>
                        <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
});

const ContactSuggestionsInner = memo(() => {
    const { suggestions, loading, permissionGranted, loadSuggestions, requestPermission, sendRequest, cancelRequest } = useContactSuggestions();

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
                    <TouchableOpacity 
                        onPress={requestPermission}
                        style={{
                            marginTop: 16,
                            backgroundColor: '#F68537',
                            paddingVertical: 10,
                            paddingHorizontal: 20,
                            borderRadius: 20,
                        }}
                    >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>Allow Permission</Text>
                    </TouchableOpacity>
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
            <View style={styles.loadingContainer}>
                <ActivityIndicator color="#F68537" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.listWrapper}>
                <View style={styles.listView}>
                    {suggestions.map((user) => (
                        <ContactRow 
                            key={user.id} 
                            user={user} 
                            sendRequest={sendRequest} 
                            cancelRequest={cancelRequest} 
                        />
                    ))}
                </View>
            </View>
        </View>
    );
});

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
    },
    opacity80: {
        opacity: 0.8,
    },
    loadingContainer: {
        padding: 16,
    }
});

export default function ContactSuggestions() {
    return (
        <ComponentErrorBoundary fallbackName="Contact Suggestions">
            <ContactSuggestionsInner />
        </ComponentErrorBoundary>
    );
}
