import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface StatusThumbnailProps {
    mediaType: 'text' | 'video' | 'image' | string;
    mediaUrl?: string;
    text?: string;
    bgColor?: string;
    isUploading?: boolean;
    showPlayIcon?: boolean;
}

const StatusThumbnail = React.memo(({
    mediaType,
    mediaUrl,
    text,
    bgColor,
    isUploading,
}: StatusThumbnailProps) => {
    if (mediaType === 'text') {
        return (
            <View style={[styles.fill, styles.centered, { backgroundColor: bgColor || '#F68537', padding: 4 }]}>
                <Text style={styles.textContent} numberOfLines={3}>
                    {text || 'T'}
                </Text>
                {isUploading && <View style={styles.uploadingOverlay}><ActivityIndicator size="small" color="white" /></View>}
            </View>
        );
    }

    if (mediaType === 'video') {
        const isValidUrl = mediaUrl && mediaUrl !== '' && !mediaUrl.startsWith('{');
        return (
            <View style={[styles.fill, styles.centered, styles.videoBg]}>
                {isValidUrl ? (
                    <>
                        <Image source={mediaUrl} style={styles.absoluteFill} />
                        <View style={styles.playIconWrapper}>
                            <Ionicons name="play" size={14} color="white" />
                        </View>
                    </>
                ) : (
                    <Ionicons name="videocam" size={24} color="white" />
                )}
                {isUploading && (
                    <View style={[styles.absoluteFill, styles.centered, styles.uploadingOverlayDark]}>
                        <ActivityIndicator size="small" color="white" />
                    </View>
                )}
            </View>
        );
    }

    // Default: image
    return (
        <View style={[styles.fill, styles.relative]}>
            <Image source={mediaUrl || ''} style={styles.fill} />
            {isUploading && (
                <View style={[styles.absoluteFill, styles.centered, styles.uploadingOverlayDark]}>
                    <ActivityIndicator size="small" color="white" />
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    fill: { width: '100%', height: '100%' },
    relative: { position: 'relative' },
    centered: { alignItems: 'center', justifyContent: 'center' },
    absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    textContent: { color: 'white', fontWeight: 'bold', fontSize: 10, textAlign: 'center' },
    uploadingOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center'
    },
    uploadingOverlayDark: { backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
    videoBg: { backgroundColor: '#1E293B', position: 'relative' },
    playIconWrapper: {
        position: 'absolute', backgroundColor: 'rgba(0,0,0,0.3)',
        width: 24, height: 24, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center'
    }
});

export default StatusThumbnail;

