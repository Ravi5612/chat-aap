import React, { useRef, memo } from 'react';
import { Modal, StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useCustomCamera } from '@/hooks/chatInput/useCustomCamera';
import { useMediaLibraryGallery } from '@/hooks/chatInput/useMediaLibraryGallery';

import { CameraOverlayControls } from './CameraOverlayControls';
import { MediaGalleryBottomSheet } from './MediaGalleryBottomSheet';

export interface CustomCameraModalProps {
    visible: boolean;
    onClose: () => void;
    onCapture: (media: { uri: string; type: 'image' | 'video' }[]) => void;
}

const CustomCameraModal = memo(({ visible, onClose, onCapture }: CustomCameraModalProps) => {
    const bottomSheetRef = useRef<BottomSheet>(null);

    const {
        cameraMode, facing, flash, isRecording, recordingDuration, cameraRef,
        toggleFacing, toggleFlash, handleLongPress, handlePressOut, handlePress
    } = useCustomCamera(onCapture, onClose);

    const { assets, formatTime } = useMediaLibraryGallery(visible);

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <GestureHandlerRootView style={styles.container}>
                <CameraView
                    ref={cameraRef}
                    style={styles.camera}
                    facing={facing}
                    flash={flash}
                    mode={cameraMode}
                >
                    <CameraOverlayControls
                        onClose={onClose}
                        flash={flash}
                        toggleFlash={toggleFlash}
                        toggleFacing={toggleFacing}
                        isRecording={isRecording}
                        recordingDuration={recordingDuration}
                        formatTime={formatTime}
                        handlePress={handlePress}
                        handleLongPress={handleLongPress}
                        handlePressOut={handlePressOut}
                    />
                </CameraView>

                <MediaGalleryBottomSheet
                    bottomSheetRef={bottomSheetRef}
                    assets={assets}
                    formatTime={formatTime}
                    onCapture={onCapture}
                    onClose={onClose}
                />
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
        ...StyleSheet.absoluteFillObject,
    },
});
