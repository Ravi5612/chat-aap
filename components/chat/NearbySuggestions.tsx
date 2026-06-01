import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNearbySuggestions } from '@/hooks/useNearbySuggestions';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

export default function NearbySuggestions() {
    const { nearbyPeople, loading, isEnabled } = useNearbySuggestions();
    const currentUser = useAuthStore(state => state.user);
    const profile = useAuthStore(state => state.profile);
    const updateProfile = useAuthStore(state => state.updateProfile);

    const [requestedIds, setRequestedIds] = React.useState<string[]>([]);

    if (!isEnabled) {
        return (
            <View style={styles.container}>
                <View style={styles.emptyCard}>
                    <View style={styles.emptyIconCircle}>
                        <Ionicons name="radar-outline" size={32} color="#94A3B8" />
                    </View>
                    <Text style={styles.emptyTitle}>Nearby Discovery is Off</Text>
                    <Text style={styles.emptyText}>
                        Turn on Nearby Discovery to find other warriors within 1 KM of your location.
                    </Text>
                    <TouchableOpacity 
                        style={[styles.addButton, { marginTop: 10, paddingHorizontal: 20 }]}
                        onPress={() => updateProfile({ nearby_notifications_enabled: true })}
                    >
                        <Ionicons name="power" size={16} color="white" />
                        <Text style={styles.addText}>Turn On</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (!loading && nearbyPeople.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.emptyCard}>
                    <View style={styles.emptyIconCircle}>
                        <Ionicons name="location-outline" size={32} color="#F68537" />
                    </View>
                    <Text style={styles.emptyTitle}>No Warriors Nearby</Text>
                    <Text style={styles.emptyText}>
                        Abhi aapke aas-paas koi bhi warrior online nahi hai. Jaise hi koi aayega, yahan dikh jayega!
                    </Text>
                    <View style={[styles.emptyHintRow, { marginBottom: 12 }]}>
                        <Ionicons name="radio-outline" size={14} color="#94A3B8" />
                        <Text style={styles.emptyHint}>Scanning within 1 KM radius</Text>
                    </View>
                    <TouchableOpacity 
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
                        onPress={() => updateProfile({ nearby_notifications_enabled: false })}
                    >
                        <Ionicons name="power" size={14} color="#EF4444" />
                        <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: 'bold' }}>Turn Off Nearby</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const sendRequest = async (targetId: string) => {
        if (!currentUser || requestedIds.includes(targetId)) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        setRequestedIds(prev => [...prev, targetId]);
        
        const { error } = await supabase.from('friend_requests').insert({
            sender_id: currentUser.id,
            receiver_id: targetId,
            status: 'pending'
        });

        if (error) {
            setRequestedIds(prev => prev.filter(id => id !== targetId));
            console.error('Request error:', error);
            return;
        }

        // Notification bhejna — receiver ko pata chale
        try {
            const { data: myProfile } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', currentUser.id)
                .single();

            await supabase.from('notifications').insert({
                user_id: targetId,
                sender_id: currentUser.id,
                type: 'friend_request',
                message: `${myProfile?.username || 'Someone'} sent you a friend request.`,
                is_read: false
            });
        } catch (notifErr) {
            console.warn('Notification failed:', notifErr);
        }
    };


    const getGenderBadge = (gender: string) => {
        if (gender === 'male') return { icon: 'male', label: 'Male', color: '#3B82F6', bg: '#EFF6FF' };
        if (gender === 'female') return { icon: 'female', label: 'Female', color: '#EC4899', bg: '#FDF2F8' };
        return { icon: 'help-circle-outline', label: 'Unknown', color: '#94A3B8', bg: '#F8FAFC' };
    };

    return (
        <View style={styles.container}>
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {loading && nearbyPeople.length === 0 ? (
                    <ActivityIndicator color="#F68537" style={{ marginLeft: 20 }} />
                ) : (
                    nearbyPeople.map((person) => (
                        <View key={person.id} style={styles.card}>
                            <View style={{ position: 'relative' }}>
                                <Image
                                    source={{ uri: `https://api.dicebear.com/7.x/bottts/svg?seed=${person.id}&backgroundColor=F3F4F6` }}
                                    style={styles.avatar}
                                    transition={500}
                                />
                                <View style={{
                                    position: 'absolute',
                                    bottom: 8,
                                    right: 2,
                                    width: 14,
                                    height: 14,
                                    backgroundColor: '#10B981',
                                    borderRadius: 7,
                                    borderWidth: 2,
                                    borderColor: 'white',
                                    zIndex: 10
                                }} />
                            </View>

                            {/* Gender Badge */}
                            {(() => {
                                const badge = getGenderBadge(person.gender);
                                return (
                                    <View style={[styles.genderBadge, { backgroundColor: badge.bg, borderColor: badge.color }]}>
                                        <Ionicons name={badge.icon as any} size={12} color={badge.color} />
                                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: badge.color, marginLeft: 2 }}>
                                            {badge.label}
                                        </Text>
                                    </View>
                                );
                            })()}
                            
                            <Text style={styles.name} numberOfLines={1}>
                                Warrior #{person.id.slice(0, 4).toUpperCase()}
                            </Text>

                            <TouchableOpacity 
                                style={[
                                    styles.addButton, 
                                    (requestedIds.includes(person.id) || person.requestStatus === 'pending') && styles.requestedButton
                                ]}
                                onPress={() => sendRequest(person.id)}
                                disabled={requestedIds.includes(person.id) || person.requestStatus === 'pending'}
                            >
                                <Ionicons 
                                    name={(requestedIds.includes(person.id) || person.requestStatus === 'pending') ? "checkmark-circle" : "person-add"} 
                                    size={16} 
                                    color="white" 
                                />
                                <Text style={styles.addText}>
                                    {(requestedIds.includes(person.id) || person.requestStatus === 'pending') ? "Sent" : "Connect"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 5,
        marginBottom: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    titleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '900',
        color: '#1F2937',
        letterSpacing: 0.5,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 4,
    },
    pulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#EF4444',
    },
    liveText: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#EF4444',
    },
    seeAll: {
        fontSize: 12,
        color: '#F68537',
        fontWeight: 'bold',
    },
    scrollContent: {
        paddingLeft: 20,
        paddingRight: 10,
    },
    card: {
        width: 130,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 12,
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#FFF1E0',
        elevation: 2,
        shadowColor: '#F68537',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        position: 'relative', // Added for gender badge positioning
    },
    genderBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 6,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 1,
        elevation: 3,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: 8,
        marginTop: 4,
    },
    name: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 10,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F68537',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 4,
    },
    requestedButton: {
        backgroundColor: '#10B981', // Green for requested state
    },
    addText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
    },
    emptyCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        marginHorizontal: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFF1E0',
        elevation: 2,
        shadowColor: '#F68537',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
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
        marginBottom: 12,
    },
    emptyHintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    emptyHint: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
    },
});
