import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusThumbnail from './StatusThumbnail';

interface HistorySectionProps {
    myStatuses: any;
    onViewStatus: (item: any) => void;
}

export default function HistorySection({ myStatuses, onViewStatus }: HistorySectionProps) {
    const historyEntries = Object.entries(myStatuses || {}).filter(([key]) => key !== 'active');

    if (historyEntries.length === 0) return null;

    return (
        <View style={{ marginRight: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 4 }}>
                <Ionicons name="time-outline" size={12} color="#94A3B8" />
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                    Recent History
                </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 20 }}>
                {historyEntries.map(([dateKey, statuses]: [string, any]) => {
                    const firstStatus = statuses[0];
                    return (
                        <View key={dateKey} style={{ alignItems: 'center', gap: 10 }}>
                            <View style={{ position: 'relative' }}>
                                <TouchableOpacity
                                    onPress={() => onViewStatus({ statuses, dateKey })}
                                    onLongPress={() => {}}
                                    style={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: 32,
                                        borderWidth: 2,
                                        borderColor: '#E2E8F0',
                                        padding: 2,
                                        backgroundColor: 'white'
                                    }}
                                >
                                    <View style={{ width: '100%', height: '100%', borderRadius: 28, overflow: 'hidden', backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' }}>
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
                                    onPress={() => {
                                        Alert.alert('History', `You are viewing ${statuses.length} status updates from ${dateKey}.`);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: -2,
                                        right: -2,
                                        backgroundColor: '#64748B',
                                        width: 18,
                                        height: 18,
                                        borderRadius: 9,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderWidth: 2,
                                        borderColor: 'white'
                                    }}
                                >
                                    <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>{statuses.length}</Text>
                                </TouchableOpacity>
                                <View style={{
                                    position: 'absolute',
                                    bottom: -2,
                                    right: -2,
                                    backgroundColor: '#3B82F6',
                                    width: 16,
                                    height: 16,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderWidth: 1.5,
                                    borderColor: 'white'
                                }}>
                                    <Ionicons name="eye" size={8} color="white" />
                                </View>
                            </View>
                            <Text style={{ fontSize: 9, fontWeight: '900', color: '#94A3B8' }}>{dateKey.toUpperCase()}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}
