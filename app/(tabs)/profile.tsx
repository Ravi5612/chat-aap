import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';

export default function ProfileScreen() {
    const swipeHandlers = useSwipeNavigation();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUser(data.user));
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <View style={{ flex: 1 }} {...swipeHandlers} collapsable={false}>
            <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#F68537' }}>Profile</Text>
                </View>

                <ScrollView style={{ flex: 1 }}>
                    <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                        <View style={{ position: 'relative' }}>
                            <Image
                                source={{ uri: user?.user_metadata?.avatar_url || 'https://via.placeholder.com/150' }}
                                style={{ width: 128, height: 128, borderRadius: 64, borderWidth: 4, borderColor: '#FFF7ED', backgroundColor: '#F3F4F6' }}
                            />
                            <TouchableOpacity style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#F68537', padding: 8, borderRadius: 9999, borderWidth: 4, borderColor: 'white' }}>
                                <Ionicons name="camera" size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', marginTop: 16, color: '#111827' }}>{user?.user_metadata?.full_name || 'Anonymous User'}</Text>
                        <Text style={{ color: '#6B7280', marginTop: 4 }}>{user?.email}</Text>
                    </View>

                    <View style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
                        <Text style={{ color: '#9CA3AF', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase', marginBottom: 16 }}>Account</Text>

                        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' }}>
                            <View style={{ backgroundColor: '#EFF6FF', padding: 8, borderRadius: 8, marginRight: 16 }}>
                                <Ionicons name="person-outline" size={24} color="#3B82F6" />
                            </View>
                            <Text style={{ flex: 1, fontSize: 16, fontWeight: '500', color: '#374151' }}>Account info</Text>
                            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                        </TouchableOpacity>

                        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' }}>
                            <View style={{ backgroundColor: '#ECFDF5', padding: 8, borderRadius: 8, marginRight: 16 }}>
                                <Ionicons name="notifications-outline" size={24} color="#10B981" />
                            </View>
                            <Text style={{ flex: 1, fontSize: 16, fontWeight: '500', color: '#374151' }}>Notifications</Text>
                            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                        </TouchableOpacity>

                        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' }}>
                            <View style={{ backgroundColor: '#F5F3FF', padding: 8, borderRadius: 8, marginRight: 16 }}>
                                <Ionicons name="lock-closed-outline" size={24} color="#8B5CF6" />
                            </View>
                            <Text style={{ flex: 1, fontSize: 16, fontWeight: '500', color: '#374151' }}>Privacy & Security</Text>
                            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleLogout}
                            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, marginTop: 32 }}
                        >
                            <View style={{ backgroundColor: '#FEF2F2', padding: 8, borderRadius: 8, marginRight: 16 }}>
                                <Ionicons name="log-out-outline" size={24} color="#EF4444" />
                            </View>
                            <Text style={{ flex: 1, fontSize: 16, fontWeight: '500', color: '#DC2626' }}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
