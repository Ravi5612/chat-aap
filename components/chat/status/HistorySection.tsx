import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusThumbnail from './StatusThumbnail';

interface HistorySectionProps {
    myStatuses: any;
    onViewStatus: (item: any) => void;
}

// Extracted memoized item to prevent full list re-renders
const HistoryItem = React.memo(({ dateKey, statuses, onViewStatus }: { dateKey: string, statuses: any[], onViewStatus: (item: any) => void }) => {
    const firstStatus = statuses[0];
    return (
        <View style={styles.itemContainer}>
            <View style={styles.relative}>
                <TouchableOpacity
                    onPress={() => onViewStatus({ statuses, dateKey })}
                    style={styles.thumbnailWrapper}
                >
                    <View style={styles.thumbnailInner}>
                        <StatusThumbnail
                            mediaType={firstStatus.media_type}
                            mediaUrl={firstStatus.media_url}
                            text={firstStatus.content}
                            bgColor={firstStatus.background_color || '#CBD5E1'}
                            showPlayIcon={firstStatus.media_type === 'video'}
                        />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => Alert.alert('History', `You are viewing ${statuses.length} status updates from ${dateKey}.`)}
                    style={styles.countBadge}
                >
                    <Text style={styles.countText}>{statuses.length}</Text>
                </TouchableOpacity>

                <View style={styles.eyeBadge}>
                    <Ionicons name="eye" size={8} color="white" />
                </View>
            </View>
            <Text style={styles.dateText}>{dateKey.toUpperCase()}</Text>
        </View>
    );
});

const HistorySection = React.memo(({ myStatuses, onViewStatus }: HistorySectionProps) => {
    const historyEntries = Object.entries(myStatuses || {}).filter(([key]) => key !== 'active');

    if (historyEntries.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="time-outline" size={12} color="#94A3B8" />
                <Text style={styles.headerText}>Recent History</Text>
            </View>
            <View style={styles.listContainer}>
                {historyEntries.map(([dateKey, statuses]: [string, any]) => (
                    <HistoryItem
                        key={dateKey}
                        dateKey={dateKey}
                        statuses={statuses}
                        onViewStatus={onViewStatus}
                    />
                ))}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: { marginRight: 24 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 4 },
    headerText: { fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.2 },
    listContainer: { flexDirection: 'row', gap: 20 },
    itemContainer: { alignItems: 'center', gap: 10 },
    relative: { position: 'relative' },
    thumbnailWrapper: {
        width: 64, height: 64, borderRadius: 32,
        borderWidth: 2, borderColor: '#E2E8F0',
        padding: 2, backgroundColor: 'white'
    },
    thumbnailInner: {
        width: '100%', height: '100%', borderRadius: 28,
        overflow: 'hidden', backgroundColor: '#F8FAFC',
        alignItems: 'center', justifyContent: 'center'
    },
    countBadge: {
        position: 'absolute', top: -2, right: -2,
        backgroundColor: '#64748B', width: 18, height: 18,
        borderRadius: 9, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: 'white'
    },
    countText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
    eyeBadge: {
        position: 'absolute', bottom: -2, right: -2,
        backgroundColor: '#3B82F6', width: 16, height: 16,
        borderRadius: 8, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: 'white'
    },
    dateText: { fontSize: 9, fontWeight: '900', color: '#94A3B8' }
});

export default HistorySection;

