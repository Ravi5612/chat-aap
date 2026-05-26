import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import StatusThumbnail from './StatusThumbnail';

interface FriendsStatusSectionProps {
    friendsWithStatus: any[];
    statusInfo: any;
    onViewStatus: (item: any) => void;
}

export default function FriendsStatusSection({
    friendsWithStatus,
    statusInfo,
    onViewStatus
}: FriendsStatusSectionProps) {
    if (!friendsWithStatus || friendsWithStatus.length === 0) return null;

    return (
        <View>
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1.2 }}>
                Updates
            </Text>
            <View style={{ flexDirection: 'row', gap: 20 }}>
                {friendsWithStatus.map((item) => {
                    const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.name)}&backgroundColor=F68537`;
                    return (
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
                                <View style={{ width: '100%', height: '100%', borderRadius: 32, overflow: 'hidden', backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                                    <StatusThumbnail
                                        mediaType={item.mediaType}
                                        mediaUrl={item.thumbnail || item.img || defaultAvatar}
                                        text={statusInfo?.[item.id]?.text}
                                        bgColor={statusInfo?.[item.id]?.bgColor}
                                        showPlayIcon={item.mediaType === 'video'}
                                    />
                                </View>
                            </TouchableOpacity>
                            <Text style={{ fontSize: 9, fontWeight: '900', color: '#64748B', maxWidth: 64, textAlign: 'center' }} numberOfLines={1}>
                                {item.name.toUpperCase()}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}
