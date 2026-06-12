import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusThumbnail from './StatusThumbnail';
import { useAuthStore } from '@/store/useAuthStore';

interface MyStatusSectionProps {
    myStatuses: any;
    statusInfo: any;
    onAddClick: () => void;
    onViewMyStatus: (index?: number) => void;
}

interface ActiveStatusBubbleProps {
    status: any;
    index: number;
    currentProfile: any;
    onViewMyStatus: (index: number) => void;
}

import { useMessageMediaCache } from '@/hooks/useMessageMediaCache';

const ActiveStatusBubble = React.memo(({
    status, index, currentProfile, onViewMyStatus
}: ActiveStatusBubbleProps) => {
    const isViewed = status.isViewed;
    const isUploading = status.isUploading;
    const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentProfile?.username || 'User')}&backgroundColor=F68537`;

    // Decrypt the thumbnail/media for preview
    const { localImageUrl } = useMessageMediaCache(
        status,
        status.media_type !== 'text' ? (status.thumbnail_url || status.media_url) : null,
        null,
        null,
        status.statusKey
    );

    const borderColor = isUploading ? '#F68537' : (isViewed ? '#D1D5DB' : '#10B981');
    const labelColor = isUploading ? '#F68537' : (isViewed ? '#94A3B8' : '#10B981');

    return (
        <View style={styles.itemContainer}>
            <View style={styles.relative}>
                <TouchableOpacity
                    onPress={isUploading
                        ? () => Alert.alert("Uploading Status", "Please wait, your status is being posted in the background...")
                        : () => onViewMyStatus(index)
                    }
                    style={[styles.activeThumbnailWrapper, { borderColor }]}
                >
                    <View style={styles.thumbnailInner}>
                        <StatusThumbnail
                            mediaType={status.media_type || 'image'}
                            mediaUrl={localImageUrl || currentProfile?.avatar_url || defaultAvatar}
                            text={status.content}
                            bgColor={status.background_color}
                            isUploading={isUploading}
                            showPlayIcon={status.media_type === 'video'}
                        />
                    </View>
                </TouchableOpacity>
            </View>
            <Text style={[styles.statusLabel, { color: labelColor }]}>
                {isUploading ? 'SENDING...' : 'VIEWING...'}
            </Text>
        </View>
    );
});

const MyStatusSection = React.memo(({
    myStatuses,
    statusInfo,
    onAddClick,
    onViewMyStatus
}: MyStatusSectionProps) => {
    const currentUser = useAuthStore(state => state.user);
    const currentProfile = useAuthStore(state => state.profile);
    const hasActive = myStatuses?.active && myStatuses.active.length > 0;

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>My Status</Text>
            <View style={styles.listContainer}>
                {/* Always show Add New button */}
                <View style={styles.itemContainer}>
                    <TouchableOpacity onPress={onAddClick} style={styles.addButton}>
                        <Ionicons name="add" size={32} color="#F68537" />
                    </TouchableOpacity>
                    <Text style={styles.addLabel}>ADD NEW</Text>
                </View>

                {/* Show individual active statuses */}
                {hasActive && myStatuses.active.map((status: any, index: number) => (
                    <ActiveStatusBubble
                        key={status.id || index}
                        status={status}
                        index={index}
                        currentProfile={currentProfile}
                        onViewMyStatus={onViewMyStatus}
                    />
                ))}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: { marginRight: 24 },
    sectionTitle: { fontSize: 10, fontWeight: '900', color: '#94A3B8', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1.2 },
    listContainer: { flexDirection: 'row', gap: 20 },
    itemContainer: { alignItems: 'center', gap: 10 },
    relative: { position: 'relative' },
    addButton: {
        width: 72, height: 72, borderRadius: 36,
        borderWidth: 2, borderStyle: 'dashed', borderColor: '#F68537',
        alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent'
    },
    addLabel: { fontSize: 9, fontWeight: '900', color: '#94A3B8' },
    activeThumbnailWrapper: {
        width: 72, height: 72, borderRadius: 36,
        borderWidth: 3, padding: 3, backgroundColor: 'white'
    },
    thumbnailInner: {
        width: '100%', height: '100%', borderRadius: 32,
        overflow: 'hidden', backgroundColor: '#F3F4F6',
        alignItems: 'center', justifyContent: 'center'
    },
    countBadge: {
        position: 'absolute', top: -2, right: -2,
        width: 22, height: 22, borderRadius: 11,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: 'white'
    },
    countText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    statusLabel: { fontSize: 9, fontWeight: '900' }
});

export default MyStatusSection;

