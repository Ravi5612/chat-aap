import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import StatusThumbnail from './StatusThumbnail';

interface FriendsStatusSectionProps {
    friendsWithStatus: any[];
    statusInfo: any;
    onViewStatus: (item: any) => void;
}

const StatusThumbnailItem = React.memo(({ item, statusInfo, onViewStatus }: { item: any, statusInfo: any, onViewStatus: (item: any) => void }) => {
    const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.name)}&backgroundColor=F68537`;
    
    return (
        <View style={styles.itemContainer}>
            <TouchableOpacity
                onPress={() => onViewStatus(item)}
                style={[
                    styles.thumbnailWrapper,
                    { borderColor: item.allStatusesViewed ? '#E2E8F0' : '#10B981' }
                ]}
            >
                <View style={styles.thumbnailInner}>
                    <StatusThumbnail
                        mediaType={item.mediaType}
                        mediaUrl={item.thumbnail || item.img || defaultAvatar}
                        text={statusInfo?.[item.id]?.text}
                        bgColor={statusInfo?.[item.id]?.bgColor}
                        showPlayIcon={item.mediaType === 'video'}
                    />
                </View>
            </TouchableOpacity>
            <Text style={styles.nameText} numberOfLines={1}>
                {item.name.toUpperCase()}
            </Text>
        </View>
    );
});

const FriendsStatusSection = React.memo(({
    friendsWithStatus,
    statusInfo,
    onViewStatus
}: FriendsStatusSectionProps) => {
    if (!friendsWithStatus || friendsWithStatus.length === 0) return null;

    return (
        <View>
            <Text style={styles.sectionTitle}>
                Updates
            </Text>
            <View style={styles.listContainer}>
                {friendsWithStatus.map((item) => (
                    <StatusThumbnailItem
                        key={item.id}
                        item={item}
                        statusInfo={statusInfo}
                        onViewStatus={onViewStatus}
                    />
                ))}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    sectionTitle: {
        fontSize: 10,
        fontWeight: '900',
        color: '#94A3B8',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1.2
    },
    listContainer: {
        flexDirection: 'row',
        gap: 20
    },
    itemContainer: {
        alignItems: 'center',
        gap: 10
    },
    thumbnailWrapper: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 3,
        padding: 3,
        backgroundColor: 'white'
    },
    thumbnailInner: {
        width: '100%',
        height: '100%',
        borderRadius: 32,
        overflow: 'hidden',
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center'
    },
    nameText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#64748B',
        maxWidth: 64,
        textAlign: 'center'
    }
});

export default FriendsStatusSection;
