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
        <View className="flex-1" {...swipeHandlers} collapsable={false}>
            <SafeAreaView className="flex-1 bg-white">
                <View className="px-4 py-4 border-b border-gray-100">
                    <Text className="text-2xl font-bold text-[#F68537]">Profile</Text>
                </View>

                <ScrollView className="flex-1">
                    <View className="items-center py-8">
                        <View className="relative">
                            <Image
                                source={{ uri: user?.user_metadata?.avatar_url || 'https://via.placeholder.com/150' }}
                                className="w-32 h-32 rounded-full border-4 border-orange-50 bg-gray-100"
                            />
                            <TouchableOpacity className="absolute bottom-0 right-0 bg-[#F68537] p-2 rounded-full border-4 border-white">
                                <Ionicons name="camera" size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                        <Text className="text-2xl font-bold mt-4 text-gray-900">{user?.user_metadata?.full_name || 'Anonymous User'}</Text>
                        <Text className="text-gray-500 mt-1">{user?.email}</Text>
                    </View>

                    <View className="px-6 py-4">
                        <Text className="text-gray-400 font-bold text-xs uppercase mb-4">Account</Text>

                        <TouchableOpacity className="flex-row items-center py-4 border-b border-gray-50">
                            <View className="bg-blue-50 p-2 rounded-lg mr-4">
                                <Ionicons name="person-outline" size={24} color="#3B82F6" />
                            </View>
                            <Text className="flex-1 text-base font-medium text-gray-700">Account info</Text>
                            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                        </TouchableOpacity>

                        <TouchableOpacity className="flex-row items-center py-4 border-b border-gray-50">
                            <View className="bg-green-50 p-2 rounded-lg mr-4">
                                <Ionicons name="notifications-outline" size={24} color="#10B981" />
                            </View>
                            <Text className="flex-1 text-base font-medium text-gray-700">Notifications</Text>
                            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                        </TouchableOpacity>

                        <TouchableOpacity className="flex-row items-center py-4 border-b border-gray-50">
                            <View className="bg-purple-50 p-2 rounded-lg mr-4">
                                <Ionicons name="lock-closed-outline" size={24} color="#8B5CF6" />
                            </View>
                            <Text className="flex-1 text-base font-medium text-gray-700">Privacy & Security</Text>
                            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleLogout}
                            className="flex-row items-center py-4 mt-8"
                        >
                            <View className="bg-red-50 p-2 rounded-lg mr-4">
                                <Ionicons name="log-out-outline" size={24} color="#EF4444" />
                            </View>
                            <Text className="flex-1 text-base font-medium text-red-600">Logout</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
