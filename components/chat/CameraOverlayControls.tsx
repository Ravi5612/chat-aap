import React from 'react';
import { View, TouchableOpacity, Text, SafeAreaView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CameraOverlayControlsProps {
    onClose: () => void;
    flash: 'on' | 'off';
    toggleFlash: () => void;
    toggleFacing: () => void;
    isRecording: boolean;
    recordingDuration: number;
    formatTime: (seconds: number) => string;
    handlePress: () => void;
    handleLongPress: () => void;
    handlePressOut: () => void;
}

export const CameraOverlayControls = ({
    onClose,
    flash,
    toggleFlash,
    toggleFacing,
    isRecording,
    recordingDuration,
    formatTime,
    handlePress,
    handleLongPress,
    handlePressOut,
}: CameraOverlayControlsProps) => {
    return (
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
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'space-between',
        padding: 20,
        paddingBottom: 60, // Leave space for the small bottom sheet handle
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
});
