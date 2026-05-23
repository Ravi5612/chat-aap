import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, SafeAreaView, StyleSheet, Dimensions, Platform, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

interface MediaViewerProps {
    visible: boolean;
    onClose: () => void;
    imageUri: string | null;
}

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');

export default function MediaViewer({ visible, onClose, imageUri }: MediaViewerProps) {
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        if (!imageUri) return;
        
        try {
            setDownloading(true);
            
            // 1. Request permissions
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please allow gallery access to save images.');
                setDownloading(false);
                return;
            }

            // 2. Determine file extension from URL
            let ext = 'jpg';
            try {
                const urlPath = imageUri.split('?')[0]; // Remove query params
                const urlParts = urlPath.split('.');
                const lastPart = urlParts[urlParts.length - 1].toLowerCase();
                if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(lastPart)) {
                    ext = lastPart === 'jpeg' ? 'jpg' : lastPart;
                }
            } catch (_) {}

            // 3. Use unique filename with timestamp to avoid conflicts
            const filename = `chatwarriors_${Date.now()}.${ext}`;
            const cacheUri = `${FileSystem.cacheDirectory}${filename}`;
            let finalUri = imageUri;

            // 4. Handle different URI types
            if (imageUri.startsWith('data:')) {
                const base64Data = imageUri.split(',')[1];
                await FileSystem.writeAsStringAsync(cacheUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
                finalUri = cacheUri;
            } else if (!imageUri.startsWith('file:')) {
                const downloadResult = await FileSystem.downloadAsync(imageUri, cacheUri, {
                    headers: { 'Accept': 'image/*' }
                });
                if (downloadResult.status !== 200) {
                    throw new Error(`Download failed with status: ${downloadResult.status}`);
                }
                finalUri = downloadResult.uri;
            }

            // 5. Save to media library
            const asset = await MediaLibrary.createAssetAsync(finalUri);

            // 6. Add to ChatWarriors album
            try {
                const album = await MediaLibrary.getAlbumAsync('ChatWarriors');
                if (album === null) {
                    await MediaLibrary.createAlbumAsync('ChatWarriors', asset, false);
                } else {
                    await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
                }
            } catch (albumErr) {
                // Album creation failed but asset is saved - that's okay
                console.warn('[DOWNLOAD] Album error (non-critical):', albumErr);
            }

            // 7. Cleanup cache file
            if (finalUri === cacheUri) {
                try { await FileSystem.deleteAsync(cacheUri, { idempotent: true }); } catch (_) {}
            }

            Alert.alert('✅ Saved!', 'Image saved to your gallery in ChatWarriors album.');
        } catch (error: any) {
            console.error('[DOWNLOAD] Error:', error);
            Alert.alert('Error', 'Could not save image. Please check your internet and try again.');
        } finally {
            setDownloading(false);
        }
    };


    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {Platform.OS === 'ios' ? (
                    <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.95)' }]} />
                )}

                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={handleDownload}
                            style={[styles.actionButton, { marginRight: 15 }]}
                            activeOpacity={0.7}
                            disabled={downloading}
                        >
                            {downloading ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Ionicons name="download-outline" size={26} color="white" />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.actionButton}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="close" size={28} color="white" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.imageContainer}>
                        {imageUri && (
                            <Image
                                source={{ uri: imageUri }}
                                style={styles.fullImage}
                                contentFit="contain"
                                transition={300}
                            />
                        )}
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        height: 60,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: 20,
        zIndex: 100,
    },
    actionButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageContainer: {
        flex: 1,
        width: WINDOW_WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: WINDOW_WIDTH,
        height: '100%',
    }
});
