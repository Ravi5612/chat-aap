import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useMessageMediaCache } from '@/hooks/useMessageMediaCache';

const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Recently updated';
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

export const StatusListItem = React.memo(({ item, onPress, onOptionsPress }: { item: any, onPress: (item: any) => void, onOptionsPress?: (item: any) => void }) => {
    // Decrypt thumbnail using the cache hook
    const { localImageUrl } = useMessageMediaCache(
        { sender_id: item.id }, // mock message object just for fallback if needed
        item.mediaType !== 'text' ? item.thumbnail : null,
        null,
        null,
        item.statusKey
    );

    const thumbnailToRender = localImageUrl || item.img || `https://api.dicebear.com/7.x/initials/svg?seed=${item.name}`;

    // Single Video thumbnail rendered once for both avatar and thumbnail areas
    const videoThumbnail = item.mediaType === 'video' ? (
        <View style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
            {localImageUrl ? (
                <>
                    <Image source={{ uri: localImageUrl }} style={{ width: '100%', height: '100%', position: 'absolute' }}  cachePolicy="memory-disk" />
                    <View style={{ position: 'absolute', backgroundColor: 'rgba(0,0,0,0.3)', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="play" size={14} color="white" />
                    </View>
                </>
            ) : (
                <Ionicons name="videocam" size={24} color="white" />
            )}
        </View>
    ) : null;

    return (
        <TouchableOpacity
            onPress={() => onPress(item)}
            activeOpacity={0.7}
            style={styles.statusItem}
        >
            <View style={{ position: 'relative' }}>
                <View style={[
                    styles.avatarRing,
                    { borderColor: item.allStatusesViewed ? '#E2E8F0' : '#F68537' }
                ]}>
                    <Image
                        source={
                            item.img 
                                ? (typeof item.img === 'string' ? { uri: item.img } : item.img)
                                : (item.gender === 'female' 
                                    ? require('@/assets/images/default-avatar-female.jpg') 
                                    : require('@/assets/images/default-avatar-male.jpg'))
                        }
                        style={styles.avatar}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                </View>
                <View style={styles.statusCountBadge}>
                    <Text style={styles.statusCountText}>{item.statusCount}</Text>
                </View>
            </View>

            <View style={{ marginLeft: 16, flex: 1 }}>
                <Text style={styles.friendName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.timeContainer}>
                    <Ionicons name="time-outline" size={12} color="#94A3B8" />
                    <Text style={styles.timeText}>{formatRelativeTime(item.latestTimestamp)}</Text>
                </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[
                    styles.thumbnail,
                    { backgroundColor: item.mediaType === 'text' ? (item.bgColor || '#F68537') : '#FDBA74' }
                ]}>
                    {item.mediaType === 'text' ? (
                        <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', padding: 4 }}>
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 8, textAlign: 'center' }} numberOfLines={3}>
                                {item.text || 'TEXT'}
                            </Text>
                        </View>
                    ) : item.mediaType === 'video' ? (
                        videoThumbnail
                    ) : (
                        <Image
                            source={{ uri: thumbnailToRender }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                        />
                    )}
                </View>
                
                <TouchableOpacity 
                    style={{ padding: 4 }} 
                    onPress={(e) => {
                        e.stopPropagation();
                        if (onOptionsPress) onOptionsPress(item);
                    }}
                >
                    <Ionicons name="ellipsis-vertical" size={20} color="#94A3B8" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    statusItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 14, borderRadius: 24, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1 },
    avatarRing: { width: 60, height: 60, borderRadius: 30, padding: 2, borderWidth: 2 },
    avatar: { width: '100%', height: '100%', borderRadius: 30 },
    statusCountBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#F68537', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
    statusCountText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    friendName: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
    timeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
    timeText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
    thumbnail: { width: 50, height: 50, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
