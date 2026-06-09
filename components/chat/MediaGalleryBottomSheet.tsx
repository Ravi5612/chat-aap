import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 4;
const IMAGE_SIZE = width / COLUMN_COUNT;

interface MediaGalleryBottomSheetProps {
    bottomSheetRef: React.RefObject<BottomSheet>;
    assets: MediaLibrary.Asset[];
    formatTime: (seconds: number) => string;
    onCapture: (media: { uri: string; type: 'image' | 'video' }) => void;
    onClose: () => void;
}

export const MediaGalleryBottomSheet = ({
    bottomSheetRef, assets, formatTime, onCapture, onClose
}: MediaGalleryBottomSheetProps) => {
    const snapPoints = useMemo(() => [40, '100%'], []);

    const renderGalleryItem = useCallback(({ item }: { item: MediaLibrary.Asset }) => {
        return (
            <TouchableOpacity
                style={styles.galleryItemContainer}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onCapture({ uri: item.uri, type: item.mediaType === 'video' ? 'video' : 'image' });
                    onClose();
                }}
            >
                <Image source={{ uri: item.uri }} style={styles.galleryItemImage} />
                {item.mediaType === 'video' && (
                    <View style={styles.videoBadge}>
                        <Ionicons name="videocam" size={12} color="white" />
                        <Text style={styles.videoDuration}>{formatTime(item.duration)}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    }, [onCapture, onClose, formatTime]);

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={0}
            snapPoints={snapPoints}
            backgroundStyle={styles.bottomSheetBackground}
            handleIndicatorStyle={styles.bottomSheetHandle}
        >
            {assets.length > 0 ? (
                <BottomSheetFlatList
                    data={assets}
                    keyExtractor={(item) => item.id}
                    renderItem={renderGalleryItem}
                    numColumns={COLUMN_COUNT}
                    contentContainerStyle={styles.galleryContent}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.emptyGallery}>
                    <Text style={styles.emptyText}>No photos found</Text>
                </View>
            )}
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    bottomSheetBackground: {
        backgroundColor: '#000000',
    },
    bottomSheetHandle: {
        backgroundColor: '#ffffff',
        opacity: 0.5,
    },
    galleryContent: {
        paddingBottom: 20,
    },
    galleryItemContainer: {
        width: IMAGE_SIZE,
        height: IMAGE_SIZE,
        padding: 1,
    },
    galleryItemImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#333',
    },
    videoBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.7)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
    },
    videoDuration: {
        color: 'white',
        fontSize: 10,
        marginLeft: 4,
        fontWeight: 'bold',
    },
    emptyGallery: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 40,
    },
    emptyText: {
        color: '#888',
        fontSize: 16,
    }
});
