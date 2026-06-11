import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HomeSkeleton from '@/components/home/HomeSkeleton';

import { useFriendsStore } from '@/store/useFriendsStore';

interface Props {
    loading: boolean;
    searchQuery: string;
}

const EmptyChatState: React.FC<Props> = ({ loading, searchQuery }) => {
    const debugLogs = useFriendsStore(state => state.debugLogs);
    const errorMsg = useFriendsStore(state => state.error);
    const handleShareApp = useCallback(async () => {
        try {
            await Share.share({
                message: 'Hey! Join me on ChatWarriors, a super fast and secure chat app! 🚀 Download it here: https://dummy-link.com/download',
            });
        } catch (error: any) {
            console.error('Error sharing app:', error);
        }
    }, []);

    if (loading) {
        return (
            <View style={{ marginTop: 20 }}>
                {(errorMsg || debugLogs) ? (
                    <View style={{ marginBottom: 20, padding: 16, backgroundColor: '#FEF2F2', borderRadius: 12, borderWidth: 1, borderColor: '#FCA5A5', marginHorizontal: 20 }}>
                        <Text style={{ color: '#DC2626', fontWeight: 'bold', marginBottom: 8 }}>Debug Information:</Text>
                        {errorMsg && <Text style={{ color: '#991B1B', fontSize: 12, marginBottom: 4 }}>Error: {errorMsg}</Text>}
                        {debugLogs ? <Text style={{ color: '#991B1B', fontSize: 10, fontFamily: 'monospace' }}>{debugLogs}</Text> : null}
                    </View>
                ) : null}
                <HomeSkeleton />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 }}>
            {searchQuery ? (
                <>
                    <Ionicons name="search-outline" size={60} color="#D1D5DB" style={{ marginBottom: 16 }} />
                    <Text style={{ color: '#6B7280', textAlign: 'center', fontSize: 16, fontWeight: '600' }}>
                        No chats found
                    </Text>
                    <Text style={{ color: '#9CA3AF', textAlign: 'center', fontSize: 14, marginTop: 8 }}>
                        Try searching with a different name.
                    </Text>
                </>
            ) : (
                <View style={{ alignItems: 'center', backgroundColor: '#FFFFFF', padding: 24, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, width: '100%' }}>
                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                        <Ionicons name="chatbubbles-outline" size={40} color="#F68537" />
                    </View>
                    <Text style={{ color: '#1F2937', textAlign: 'center', fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                        It's quiet here...
                    </Text>
                    <Text style={{ color: '#6B7280', textAlign: 'center', fontSize: 14, lineHeight: 20, marginBottom: 24 }}>
                        You don't have any friends on ChatWarriors yet. Invite your friends to start chatting!
                    </Text>
                    <TouchableOpacity 
                        onPress={handleShareApp}
                        style={{ backgroundColor: '#F68537', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}
                    >
                        <Ionicons name="share-social" size={20} color="white" style={{ marginRight: 8 }} />
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>
                            Invite Friends
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {(errorMsg || debugLogs) ? (
                <View style={{ marginTop: 20, padding: 16, backgroundColor: '#FEF2F2', borderRadius: 12, width: '100%', borderWidth: 1, borderColor: '#FCA5A5' }}>
                    <Text style={{ color: '#DC2626', fontWeight: 'bold', marginBottom: 8 }}>Debug Information:</Text>
                    {errorMsg && <Text style={{ color: '#991B1B', fontSize: 12, marginBottom: 4 }}>Error: {errorMsg}</Text>}
                    {debugLogs ? <Text style={{ color: '#991B1B', fontSize: 10, fontFamily: 'monospace' }}>{debugLogs}</Text> : null}
                </View>
            ) : null}
        </View>
    );
};

export default EmptyChatState;
