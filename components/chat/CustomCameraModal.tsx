import React, { useState, useRef, useEffect } from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import { CameraView, CameraType, FlashMode } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export interface CustomCameraModalProps {
    visible: boolean;
    onClose: () => void;
    onCapture: (media: { uri: string; type: 'image' | 'video' }) => void;
}

export default function CustomCameraModal({ visible, onClose, onCapture }: CustomCameraModalProps) {
    const [facing, setFacing] = useState<CameraType>('back');
    const [flash, setFlash] = useState<FlashMode>('off');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const cameraRef = useRef<CameraView>(null);

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

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const toggleFacing = () => setFacing(current => (current === 'back' ? 'front' : 'back'));
    const toggleFlash = () => setFlash(current => (current === 'off' ? 'on' : 'off'));

    const handlePressIn = async () => {
        // Prepare for potential long press (video)
        // Wait a tiny bit to distinguish between tap and hold
    };

    const handleLongPress = async () => {
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
    };

    const handlePressOut = async () => {
        if (isRecording && cameraRef.current) {
            cameraRef.current.stopRecording();
            setIsRecording(false);
        }
    };

    const handlePress = async () => {
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
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <View style={styles.container}>
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
            </View>
        </Modal>
    );
}

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
        marginBottom: 40,
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
    }
});
