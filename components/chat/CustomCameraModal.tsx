import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, Text, SafeAreaView, Dimensions, Image } from 'react-native';
import { CameraView, CameraType, FlashMode } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 4;
const IMAGE_SIZE = width / COLUMN_COUNT;

export interface CustomCameraModalProps {
    visible: boolean;
    onClose: () => void;
    onCapture: (media: { uri: string; type: 'image' | 'video' }) => void;
}

const CustomCameraModal = memo(({ visible, onClose, onCapture }: CustomCameraModalProps) => {
    const [facing, setFacing] = useState<CameraType>('back');
    const [flash, setFlash] = useState<FlashMode>('off');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
    
    const cameraRef = useRef<CameraView>(null);
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => [180, '100%'], []);
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

    useEffect(() => {
        if (visible && permissionResponse?.status === 'granted') {
            loadAssets();
        }
    }, [visible, permissionResponse]);

    useEffect(() => {
        if (visible && !permissionResponse?.granted && permissionResponse?.canAskAgain) {
            requestPermission();
        }
    }, [visible]);

    const loadAssets = async () => {
        try {
            const media = await MediaLibrary.getAssetsAsync({
                mediaType: ['photo', 'video'],
                first: 100,
                sortBy: ['creationTime'],
            });
            setAssets(media.assets);
        } catch (error) {
            console.log('Error fetching media:', error);
        }
    };

    // Timer effect for recording
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRecording) {
            setRecordingDuration(0);
            interval = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } else {
            setRecordingDuration(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRecording]);

    const formatTime = useCallback((seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }, []);

    const toggleFacing = useCallback(() => setFacing(current => (current === 'back' ? 'front' : 'back')), []);
    const toggleFlash = useCallback(() => setFlash(current => (current === 'off' ? 'on' : 'off')), []);

    const handleLongPress = useCallback(async () => {
        if (!cameraRef.current) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsRecording(true);
        try {
            const video = await cameraRef.current.recordAsync({ maxDuration: 60 });
            if (video && video.uri) {
                onCapture({ uri: video.uri, type: 'video' });
                onClose();
            }
        } catch (error) {
            console.error('Record error:', error);
        }
        setIsRecording(false);
    }, [onCapture, onClose]);

    const handlePressOut = useCallback(async () => {
        if (isRecording && cameraRef.current) {
            cameraRef.current.stopRecording();
            setIsRecording(false);
        }
    }, [isRecording]);

    const handlePress = useCallback(async () => {
        if (isRecording) return; // Ignore single tap if already recording
        if (!cameraRef.current) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
            if (photo && photo.uri) {
                onCapture({ uri: photo.uri, type: 'image' });
                onClose();
            }
        } catch (error) {
            console.error('Take picture error:', error);
        }
    }, [isRecording, onCapture, onClose]);

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

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <GestureHandlerRootView style={styles.container}>
                <CameraView
                    ref={cameraRef}
                    style={styles.camera}
                    facing={facing}
                    flash={flash}
                    mode="video" // Allow both photo and video capture
                >
                    <SafeAreaView style={styles.overlay}>
                        <View style={styles.topControls}>
                            <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                                <Ionicons name="close" size={28} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={toggleFlash} style={styles.iconButton}>
                                <Ionicons name={flash === 'on' ? 'flash' : 'flash-off'} size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.bottomControls}>
                            <TouchableOpacity style={styles.iconButton} onPress={toggleFacing}>
                                <Ionicons name="camera-reverse" size={32} color="white" />
                            </TouchableOpacity>
                            
                            <View style={styles.captureContainer}>
                                {isRecording && (
                                    <View style={styles.timerContainer}>
                                        <View style={styles.recordingDot} />
                                        <Text style={styles.timerText}>{formatTime(recordingDuration)}</Text>
                                    </View>
                                )}
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={handlePress}
                                    onLongPress={handleLongPress}
                                    onPressOut={handlePressOut}
                                    delayLongPress={300}
                                    style={[styles.captureButton, isRecording && styles.recordingButton]}
                                >
                                    <View style={[styles.captureInner, isRecording && styles.recordingInner]} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.spacer} />
                        </View>
                    </SafeAreaView>
                </CameraView>

                {/* WhatsApp Style Bottom Sheet Gallery */}
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
            </GestureHandlerRootView>
        </Modal>
    );
});

export default CustomCameraModal;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        justifyContent: 'space-between',
        padding: 20,
        paddingBottom: 190, // Leave space for the collapsed bottom sheet
    },
    topControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    bottomControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    iconButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordingButton: {
        borderColor: '#EF4444',
    },
    captureInner: {
        width: 66,
        height: 66,
        borderRadius: 33,
        backgroundColor: 'white',
    },
    recordingInner: {
        backgroundColor: '#EF4444',
        width: 34,
        height: 34,
        borderRadius: 8,
    },
    spacer: {
        width: 50,
    },
    timerContainer: {
        position: 'absolute',
        top: -40,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        marginRight: 8,
    },
    timerText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
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
