import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

export default function UserProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!id) return;
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();

            if (!error) {
                setProfile(data);
            }
            setLoading(false);
        };
        fetchProfile();
    }, [id]);

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#F68537" />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <Text style={{ fontSize: 18, color: '#64748B', textAlign: 'center' }}>User not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, backgroundColor: '#F68537', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}>
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#EBD8B7' }}>
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={{ flex: 0, backgroundColor: '#F68537' }} />

            <View style={{
                backgroundColor: '#F68537',
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                borderBottomLeftRadius: 24,
                borderBottomRightRadius: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
                zIndex: 10
            }}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 12 }}
                >
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={{ fontSize: 20, fontWeight: 'bold', marginLeft: 16, color: 'white' }}>Profile Detail</Text>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <View style={{ position: 'relative' }}>
                        <Image
                            source={{ uri: profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.username || 'User')}&backgroundColor=F68537` }}
                            style={{ width: 140, height: 140, borderRadius: 70, borderWidth: 4, borderColor: 'white' }}
                        />
                        <View style={{
                            position: 'absolute',
                            bottom: 5,
                            right: 5,
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: '#10B981',
                            borderWidth: 3,
                            borderColor: '#EBD8B7'
                        }} />
                    </View>
                    <Text style={{ fontSize: 28, fontWeight: 'bold', marginTop: 20, color: '#111827' }}>{profile.username || 'user'}</Text>
                    <Text style={{ color: '#64748B', marginTop: 4, fontSize: 16, fontWeight: '500' }}>{profile.email}</Text>

                    <View style={{ flexDirection: 'row', marginTop: 32, gap: 16 }}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{ backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 }}
                        >
                            <Ionicons name="chatbubble-ellipses" size={20} color="#F68537" />
                            <Text style={{ fontWeight: '600', color: '#1F2937' }}>Chat</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{ backgroundColor: '#F68537', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#F68537', shadowOpacity: 0.2, shadowRadius: 5, elevation: 3 }}
                        >
                            <Ionicons name="call" size={20} color="white" />
                            <Text style={{ fontWeight: '600', color: 'white' }}>Call</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ marginHorizontal: 16, backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 1 }}>
                    <Text style={{ fontSize: 13, color: '#F68537', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 }}>About</Text>
                    <Text style={{ fontSize: 16, color: '#4B5563', lineHeight: 24 }}>
                        Hey there! I am using ChatWarriors. Let's connect and chat! 🛡️✨
                    </Text>
                </View>

                <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: 'white', borderRadius: 24, overflow: 'hidden' }}>
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                        <View style={{ padding: 10, backgroundColor: '#FEF3C7', borderRadius: 12 }}>
                            <Ionicons name="notifications" size={20} color="#D97706" />
                        </View>
                        <Text style={{ flex: 1, marginLeft: 16, fontSize: 16, fontWeight: '500', color: '#374151' }}>Mute Notifications</Text>
                        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </TouchableOpacity>

                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
                        <View style={{ padding: 10, backgroundColor: '#DBEAFE', borderRadius: 12 }}>
                            <Ionicons name="images" size={20} color="#2563EB" />
                        </View>
                        <Text style={{ flex: 1, marginLeft: 16, fontSize: 16, fontWeight: '500', color: '#374151' }}>Media & Links</Text>
                        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                </View>

                <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: 'white', borderRadius: 24, overflow: 'hidden' }}>
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                        <View style={{ padding: 10, backgroundColor: '#FEE2E2', borderRadius: 12 }}>
                            <Ionicons name="ban" size={20} color="#EF4444" />
                        </View>
                        <Text style={{ flex: 1, marginLeft: 16, fontSize: 16, fontWeight: '600', color: '#EF4444' }}>Block User</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
                        <View style={{ padding: 10, backgroundColor: '#FEE2E2', borderRadius: 12 }}>
                            <Ionicons name="flag" size={20} color="#EF4444" />
                        </View>
                        <Text style={{ flex: 1, marginLeft: 16, fontSize: 16, fontWeight: '600', color: '#EF4444' }}>Report User</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}
