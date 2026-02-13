import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';

export default function CallsScreen() {
    const swipeHandlers = useSwipeNavigation();

    return (
        <View style={{ flex: 1 }} {...swipeHandlers} collapsable={false}>
            <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#F68537' }}>Calls</Text>
                    <TouchableOpacity style={{ backgroundColor: '#FFF7ED', padding: 8, borderRadius: 9999 }}>
                        <Ionicons name="call-outline" size={24} color="#F68537" />
                    </TouchableOpacity>
                </View>

                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                    <View style={{ backgroundColor: '#FFF7ED', padding: 40, borderRadius: 9999, marginBottom: 24 }}>
                        <Ionicons name="call" size={80} color="#F68537" />
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1F2937' }}>No recent calls</Text>
                    <Text style={{ color: '#6B7280', textAlign: 'center', marginTop: 8 }}>
                        Start a voice or video call with your friends to stay connected.
                    </Text>

                    <TouchableOpacity style={{ marginTop: 32, backgroundColor: '#F68537', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 9999, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 5 }}>
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>New Call</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}
