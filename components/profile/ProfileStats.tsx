import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

interface ProfileStatsProps {
    friendsCount: number;
    sentCount: number;
    receivedCount: number;
}

export default function ProfileStats({ friendsCount, sentCount, receivedCount }: ProfileStatsProps) {
    const router = useRouter();

    return (
        <View style={styles.statsContainer}>
            <View style={styles.statBox}>
                <Text style={styles.statValue}>{friendsCount}</Text>
                <Text style={styles.statLabel}>FRIENDS</Text>
            </View>
            <TouchableOpacity style={styles.statBox} onPress={() => router.push('/sent-requests' as any)}>
                <Text style={styles.statValue}>{sentCount}</Text>
                <Text style={styles.statLabel}>SENT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statBox} onPress={() => router.push('/friend-requests' as any)}>
                <Text style={styles.statValue}>{receivedCount}</Text>
                <Text style={styles.statLabel}>RECEIVED</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        marginTop: 24,
    },
    statBox: {
        backgroundColor: '#FFF9F1',
        width: '30%',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFF1E0',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F68537',
    },
    statLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#A08D7D',
        marginTop: 4,
    },
});
