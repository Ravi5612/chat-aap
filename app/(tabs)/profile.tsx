import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect } from 'react';

export default function ProfileScreen() {
    const swipeHandlers = useSwipeNavigation();
    const { user, profile, signOut, syncProfile } = useAuthStore();

    useEffect(() => {
        syncProfile();
    }, []);

    const handleLogout = async () => {
        await signOut();
    };

    const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
    const fullName = profile?.full_name || user?.user_metadata?.full_name || 'Chat Warrior';
    const email = user?.email || '';

    return (
        <View style={{ flex: 1 }} {...swipeHandlers} collapsable={false}>
            <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#F68537' }}>Profile</Text>
                    {/* Add Edit Button or other actions here if needed */}
                </View>

                <ScrollView style={{ flex: 1 }}>
                    <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                        <View style={{ position: 'relative' }}>
                            <Image
                                source={avatarUrl ? { uri: avatarUrl } : require('@/assets/images/logo.png')}
                                style={{ width: 128, height: 128, borderRadius: 64, borderWidth: 4, borderColor: '#FFF7ED', backgroundColor: '#F3F4F6' }}
                                contentFit="cover"
                                transition={500}
                            />
                            <TouchableOpacity style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#F68537', padding: 8, borderRadius: 9999, borderWidth: 4, borderColor: 'white' }}>
                                <Ionicons name="camera" size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', marginTop: 16, color: '#111827' }}>{fullName}</Text>
                        <Text style={{ color: '#6B7280', marginTop: 4 }}>{email}</Text>
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
