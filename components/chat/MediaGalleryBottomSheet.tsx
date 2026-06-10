import React, { useMemo, useCallback, useState } from 'react';
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
    onCapture: (media: { uri: string; type: 'image' | 'video' }[]) => void;
    onClose: () => void;
}

export const MediaGalleryBottomSheet = ({
    bottomSheetRef, assets, formatTime, onCapture, onClose
}: MediaGalleryBottomSheetProps) => {
    const snapPoints = useMemo(() => [40, '100%'], []);

    const [selectedItems, setSelectedItems] = useState<{ uri: string; type: 'image' | 'video' }[]>([]);

    const toggleSelection = useCallback((item: MediaLibrary.Asset) => {
        setSelectedItems(prev => {
            const exists = prev.find(i => i.uri === item.uri);
            if (exists) return prev.filter(i => i.uri !== item.uri);
            if (prev.length >= 10) return prev; // limit to 10 max
            return [...prev, { uri: item.uri, type: item.mediaType === 'video' ? 'video' : 'image' }];
        });
    }, []);

    const handleSend = useCallback(() => {
        if (selectedItems.length > 0) {
            onCapture(selectedItems);
            setSelectedItems([]);
            onClose();
        }
    }, [selectedItems, onCapture, onClose]);

    const renderGalleryItem = useCallback(({ item }: { item: MediaLibrary.Asset }) => {
        const isSelected = selectedItems.some(i => i.uri === item.uri);
        return (
            <TouchableOpacity
                style={styles.galleryItemContainer}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    toggleSelection(item);
                }}
            >
                <Image source={{ uri: item.uri }} style={[styles.galleryItemImage, isSelected && { opacity: 0.6 }]} />
                {isSelected && (
                    <View style={styles.selectedOverlay}>
                        <Ionicons name="checkmark-circle" size={24} color="#F68537" />
                    </View>
                )}
                {item.mediaType === 'video' && (
                    <View style={styles.videoBadge}>
                        <Ionicons name="videocam" size={12} color="white" />
                        <Text style={styles.videoDuration}>{formatTime(item.duration)}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    }, [selectedItems, toggleSelection, formatTime]);

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={0}
            snapPoints={snapPoints}
            backgroundStyle={styles.bottomSheetBackground}
            handleIndicatorStyle={styles.bottomSheetHandle}
        >
            {selectedItems.length > 0 && (
                <View style={styles.selectionHeader}>
                    <Text style={styles.selectionText}>{selectedItems.length} Selected</Text>
                    <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                        <Text style={styles.sendButtonText}>Send</Text>
                        <Ionicons name="send" size={16} color="white" />
                    </TouchableOpacity>
                </View>
            )}
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
    },
    selectedOverlay: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 12,
    },
    selectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#222',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    selectionText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    sendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F68537',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    sendButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        marginRight: 6,
    }
});
