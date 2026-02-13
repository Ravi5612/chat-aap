import { View, Text, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CallsScreen() {
    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-4 py-4 border-b border-gray-100 flex-row justify-between items-center">
                <Text className="text-2xl font-bold text-[#F68537]">Calls</Text>
                <TouchableOpacity className="bg-orange-50 p-2 rounded-full">
                    <Ionicons name="call-outline" size={24} color="#F68537" />
                </TouchableOpacity>
            </View>

            <View className="flex-1 items-center justify-center p-10">
                <View className="bg-orange-50 p-10 rounded-full mb-6">
                    <Ionicons name="call" size={80} color="#F68537" />
                </View>
                <Text className="text-xl font-bold text-gray-800">No recent calls</Text>
                <Text className="text-gray-500 text-center mt-2">
                    Start a voice or video call with your friends to stay connected.
                </Text>

                <TouchableOpacity className="mt-8 bg-[#F68537] px-8 py-3 rounded-full shadow-lg">
                    <Text className="text-white font-bold text-lg">New Call</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
