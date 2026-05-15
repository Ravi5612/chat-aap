import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNearbySuggestions } from '@/hooks/useNearbySuggestions';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

export default function NearbySuggestions() {
    const { nearbyPeople, loading } = useNearbySuggestions();
    const { user: currentUser, profile } = useAuthStore();

    if (!loading && nearbyPeople.length === 0) return null;

    const sendRequest = async (targetId: string) => {
        if (!currentUser) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        const { error } = await supabase.from('friend_requests').insert({
            sender_id: currentUser.id,
            receiver_id: targetId,
            status: 'pending'
        });

        if (!error) {
            // Logic to update UI or show success can go here
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.titleGroup}>
                    <View style={styles.liveBadge}>
                        <View style={styles.pulseDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                    </View>
                    <Text style={styles.title}>Warriors Nearby</Text>
                </View>
                <TouchableOpacity>
                    <Text style={styles.seeAll}>1KM Radius</Text>
                </TouchableOpacity>
            </View>

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
                            <Image
                                source={{ uri: person.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${person.username}&backgroundColor=F68537` }}
                                style={styles.avatar}
                                transition={500}
                            />
                            <Text style={styles.name} numberOfLines={1}>{person.username}</Text>
                            <TouchableOpacity 
                                style={styles.addButton}
                                onPress={() => sendRequest(person.id)}
                            >
                                <Ionicons name="person-add" size={16} color="white" />
                                <Text style={styles.addText}>Connect</Text>
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
        marginTop: 20,
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
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: 8,
    },
    name: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 8,
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
    addText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
    },
});
