import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatusBarProps {
    myStatuses: any;
    friendsWithStatus: any[];
    onAddClick: () => void;
    onViewStatus: (item: any) => void;
    onViewMyStatus: () => void;
}

export default function StatusBar({
    myStatuses,
    friendsWithStatus,
    onAddClick,
    onViewStatus,
    onViewMyStatus
}: StatusBarProps) {
    return (
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <View style={{
                backgroundColor: '#FDF7E7', // Light sandy background for the card
                borderRadius: 32,
                padding: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2
            }}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ alignItems: 'flex-start' }}
                >
                    {/* 1. My Status Section */}
                    <View style={{ marginRight: 24 }}>
                        <Text style={{
                            fontSize: 10,
                            fontWeight: '900',
                            color: '#94A3B8',
                            marginBottom: 16,
                            textTransform: 'uppercase',
                            letterSpacing: 1.2
                        }}>My Status</Text>

                        <View style={{ flexDirection: 'row', gap: 20 }}>
                            {/* Always show Add New button */}
                            <View style={{ alignItems: 'center', gap: 10 }}>
                                <TouchableOpacity
                                    onPress={onAddClick}
                                    style={{
                                        width: 72,
                                        height: 72,
                                        borderRadius: 36,
                                        borderWidth: 2,
                                        borderStyle: 'dashed',
                                        borderColor: '#F68537',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: 'transparent'
                                    }}
                                >
                                    <Ionicons name="add" size={32} color="#F68537" />
                                </TouchableOpacity>
                                <Text style={{ fontSize: 9, fontWeight: '900', color: '#94A3B8' }}>ADD NEW</Text>
                            </View>

                            {/* Show Active Bundle if any */}
                            {myStatuses.active && myStatuses.active.length > 0 && (() => {
                                const allViewed = myStatuses.active.every((s: any) => s.isViewed);
                                return (
                                    <View style={{ alignItems: 'center', gap: 10 }}>
                                        <View style={{ position: 'relative' }}>
                                            <TouchableOpacity
                                                onPress={onViewMyStatus}
                                                style={{
                                                    width: 72,
                                                    height: 72,
                                                    borderRadius: 36,
                                                    borderWidth: 3,
                                                    borderColor: allViewed ? '#D1D5DB' : '#10B981',
                                                    padding: 3,
                                                    backgroundColor: 'white'
                                                }}
                                            >
                                                <View style={{ width: '100%', height: '100%', borderRadius: 32, overflow: 'hidden', backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                                                    {myStatuses.active[0].media_type === 'text' ? (
                                                        <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: myStatuses.active[0].background_color || '#F68537' }}>
                                                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 20 }}>{myStatuses.active[0].content?.charAt(0)}</Text>
                                                        </View>
                                                    ) : (
                                                        <Image source={{ uri: myStatuses.active[0].media_url }} style={{ width: '100%', height: '100%' }} />
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                            <View style={{
                                                position: 'absolute',
                                                top: -2,
                                                right: -2,
                                                backgroundColor: allViewed ? '#94A3B8' : '#10B981',
                                                width: 22,
                                                height: 22,
                                                borderRadius: 11,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderWidth: 2,
                                                borderColor: 'white'
                                            }}>
                                                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{myStatuses.active.length}</Text>
                                            </View>
                                        </View>
                                        <Text style={{ fontSize: 9, fontWeight: '900', color: allViewed ? '#94A3B8' : '#10B981' }}>VIEWING...</Text>
                                    </View>
                                );
                            })()}
                        </View>
                    </View>

                    {/* 2. Vertical Divider (if history or friends exist) */}
                    {(Object.keys(myStatuses).some(key => key !== 'active') || friendsWithStatus.length > 0) && (
                        <View style={{ width: 1, height: 60, backgroundColor: 'rgba(0,0,0,0.05)', marginRight: 24, marginTop: 28 }} />
                    )}

                    {/* 3. Recent History Section */}
                    {Object.keys(myStatuses).some(key => key !== 'active') && (
                        <View style={{ marginRight: 24 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 4 }}>
                                <Ionicons name="time-outline" size={12} color="#94A3B8" />
                                <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.2 }}>Recent History</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 20 }}>
                                {Object.entries(myStatuses)
                                    .filter(([key]) => key !== 'active')
                                    .map(([dateKey, statuses]: [string, any]) => (
                                        <View key={dateKey} style={{ alignItems: 'center', gap: 10 }}>
                                            <View style={{ position: 'relative' }}>
                                                <TouchableOpacity
                                                    onPress={() => onViewStatus({ statuses, dateKey })}
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
                                                        {statuses[0].media_type === 'text' ? (
                                                            <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: statuses[0].background_color || '#CBD5E1' }}>
                                                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>{statuses[0].content?.charAt(0)}</Text>
                                                            </View>
                                                        ) : (
                                                            <Image source={{ uri: statuses[0].media_url }} style={{ width: '100%', height: '100%' }} />
                                                        )}
                                                    </View>
                                                </TouchableOpacity>
                                                <View style={{
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
                                                }}>
                                                    <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>{statuses.length}</Text>
                                                </View>
                                                {/* Small blue eye icon for views parity if needed */}
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
                                    ))}
                            </View>
                        </View>
                    )}

                    {/* 4. Friends Statuses Header (If any) */}
                    {friendsWithStatus.length > 0 && (
                        <View>
                            <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1.2 }}>Updates</Text>
                            <View style={{ flexDirection: 'row', gap: 20 }}>
                                {friendsWithStatus.map((item) => (
                                    <View key={item.id} style={{ alignItems: 'center', gap: 10 }}>
                                        <TouchableOpacity
                                            onPress={() => onViewStatus(item)}
                                            style={{
                                                width: 72,
                                                height: 72,
                                                borderRadius: 36,
                                                borderWidth: 3,
                                                borderColor: item.allStatusesViewed ? '#E2E8F0' : '#10B981',
                                                padding: 3,
                                                backgroundColor: 'white'
                                            }}
                                        >
                                            <Image
                                                source={{ uri: item.img || 'https://via.placeholder.com/150' }}
                                                style={{ width: '100%', height: '100%', borderRadius: 32 }}
                                            />
                                        </TouchableOpacity>
                                        <Text style={{ fontSize: 9, fontWeight: '900', color: '#64748B', maxWidth: 64, textAlign: 'center' }} numberOfLines={1}>
                                            {item.name.toUpperCase()}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </ScrollView>
            </View>
        </View>
    );
}
