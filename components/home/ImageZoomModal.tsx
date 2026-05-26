import React from 'react';
import { View, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

interface ImageZoomModalProps {
    imageUrl: string | null;
    onClose: () => void;
}

export default function ImageZoomModal({ imageUrl, onClose }: ImageZoomModalProps) {
    if (!imageUrl) return null;

    return (
        <Modal
            visible={!!imageUrl}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={onClose}
            >
                {/* BlurView is GPU-heavy on Android — use plain semi-transparent View instead */}
                {Platform.OS === 'android' ? (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.78)' }]} />
                ) : (
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                )}
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: imageUrl }}
                        style={styles.image}
                        contentFit="cover"
                    />
                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.closeButton}
                    >
                        <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContainer: {
        width: '85%',
        aspectRatio: 1,
        backgroundColor: 'white',
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    closeButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 20,
        padding: 8,
    }
});
