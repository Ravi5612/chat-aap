import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusThumbnail from './StatusThumbnail';
import { useAuthStore } from '@/store/useAuthStore';

interface MyStatusSectionProps {
    myStatuses: any;
    statusInfo: any;
    onAddClick: () => void;
    onViewMyStatus: () => void;
}

interface ActiveStatusBubbleProps {
    myStatuses: any;
    statusInfo: any;
    currentUser: any;
    currentProfile: any;
    onViewMyStatus: () => void;
}

const ActiveStatusBubble = React.memo(({
    myStatuses, statusInfo, currentUser, currentProfile, onViewMyStatus
}: ActiveStatusBubbleProps) => {
    const allViewed = useMemo(() => myStatuses.active.every((s: any) => s.isViewed), [myStatuses.active]);
    const hasUploading = useMemo(() => myStatuses.active.some((s: any) => s.isUploading), [myStatuses.active]);
    const activeFirst = myStatuses.active[0];
    const userId = currentUser?.id || '';
    const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentProfile?.username || 'User')}&backgroundColor=F68537`;

    const borderColor = hasUploading ? '#F68537' : (allViewed ? '#D1D5DB' : '#10B981');
    const badgeBg = allViewed ? '#94A3B8' : '#10B981';
    const labelColor = hasUploading ? '#F68537' : (allViewed ? '#94A3B8' : '#10B981');

    return (
        <View style={styles.itemContainer}>
            <View style={styles.relative}>
                <TouchableOpacity
                    onPress={hasUploading
                        ? () => Alert.alert("Uploading Status", "Please wait, your status is being posted in the background...")
                        : onViewMyStatus
                    }
                    style={[styles.activeThumbnailWrapper, { borderColor }]}
                >
                    <View style={styles.thumbnailInner}>
                        {hasUploading ? (
                            <StatusThumbnail
                                mediaType={activeFirst.media_type}
                                mediaUrl={activeFirst.media_url}
                                text={activeFirst.content}
                                bgColor={activeFirst.background_color}
                                isUploading={true}
                            />
                        ) : (
                            <StatusThumbnail
                                mediaType={statusInfo?.[userId]?.mediaType || 'image'}
                                mediaUrl={statusInfo?.[userId]?.thumbnail || currentProfile?.avatar_url || defaultAvatar}
                                text={statusInfo?.[userId]?.text}
                                bgColor={statusInfo?.[userId]?.bgColor}
                                showPlayIcon={statusInfo?.[userId]?.mediaType === 'video'}
                            />
                        )}
                    </View>
                </TouchableOpacity>
                {!hasUploading && (
                    <View style={[styles.countBadge, { backgroundColor: badgeBg }]}>
                        <Text style={styles.countText}>{myStatuses.active.length}</Text>
                    </View>
                )}
            </View>
            <Text style={[styles.statusLabel, { color: labelColor }]}>
                {hasUploading ? 'SENDING...' : 'VIEWING...'}
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

                {/* Show Active Bundle if any */}
                {hasActive && (
                    <ActiveStatusBubble
                        myStatuses={myStatuses}
                        statusInfo={statusInfo}
                        currentUser={currentUser}
                        currentProfile={currentProfile}
                        onViewMyStatus={onViewMyStatus}
                    />
                )}
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

