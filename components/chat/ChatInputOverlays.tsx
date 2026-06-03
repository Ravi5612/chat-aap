import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EditingBannerProps {
    editingMessage: any;
    onCancelEdit?: () => void;
}

export const EditingBanner = memo(({ editingMessage, onCancelEdit }: EditingBannerProps) => {
    return (
        <View style={styles.editingContainer}>
            <View style={styles.editingLeft}>
                <View style={styles.editingBar} />
                <View style={styles.flex1}>
                    <Text style={styles.editingTitle}>Editing message...</Text>
                    <Text style={styles.editingText} numberOfLines={1}>
                        {editingMessage.message}
                    </Text>
                </View>
            </View>
            <TouchableOpacity onPress={onCancelEdit} style={styles.closeBtn}>
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
        </View>
    );
});

interface SelectedImagePreviewProps {
    imageUri: string;
    onRemove: () => void;
    isVideo?: boolean;
}

export const SelectedImagePreview = memo(({ imageUri, onRemove, isVideo }: SelectedImagePreviewProps) => {
    return (
        <View style={styles.previewContainer}>
            {isVideo ? (
                <View style={styles.videoThumb}>
                    <Ionicons name="play-circle" size={32} color="white" />
                </View>
            ) : (
                <Image source={{ uri: imageUri }} style={styles.imageThumb} />
            )}
            <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
                <Ionicons name="close" size={16} color="white" />
            </TouchableOpacity>
            <Text style={styles.previewLabel}>{isVideo ? 'Video selected' : 'Image selected'}</Text>
        </View>
    );
});

export const NonMemberOverlay = memo(() => {
    return (
        <View style={styles.overlayContainer}>
            <View style={styles.overlayCard}>
                <Text style={styles.overlayIcon}>🚫</Text>
                <Text style={styles.overlayText}>
                    You are no longer a member of this group
                </Text>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    // EditingBanner
    editingContainer: {
        paddingHorizontal: 16, paddingVertical: 8,
        backgroundColor: '#FFF7ED', borderBottomWidth: 1,
        borderBottomColor: 'rgba(246,133,55,0.3)',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    editingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    editingBar: { width: 4, height: 40, backgroundColor: '#F68537', borderRadius: 9999, marginRight: 12 },
    flex1: { flex: 1 },
    editingTitle: { fontSize: 12, color: '#F68537', fontWeight: 'bold', marginBottom: 2 },
    editingText: { fontSize: 12, color: '#4B5563' },
    closeBtn: { padding: 4 },

    // SelectedImagePreview
    previewContainer: {
        paddingHorizontal: 16, paddingVertical: 8,
        backgroundColor: '#F9FAFB', borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center',
    },
    videoThumb: {
        width: 64, height: 64, borderRadius: 8, marginRight: 16,
        backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center',
    },
    imageThumb: { width: 64, height: 64, borderRadius: 8, marginRight: 16 },
    removeBtn: {
        position: 'absolute', top: 4, left: 64,
        backgroundColor: '#EF4444', borderRadius: 9999,
    },
    previewLabel: { fontSize: 12, color: '#6B7280', fontStyle: 'italic' },

    // NonMemberOverlay
    overlayContainer: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(249,250,251,0.8)',
        zIndex: 100, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20,
    },
    overlayCard: {
        backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB',
        flexDirection: 'row', alignItems: 'center', gap: 8,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1, shadowRadius: 4,
    },
    overlayIcon: { fontSize: 18 },
    overlayText: { fontSize: 13, fontWeight: 'bold', color: '#6B7280' },
});

