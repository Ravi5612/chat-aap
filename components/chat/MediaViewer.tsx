import React from 'react';
import { View, Modal, TouchableOpacity, SafeAreaView, StyleSheet, Dimensions, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface MediaViewerProps {
    visible: boolean;
    onClose: () => void;
    imageUri: string | null;
}

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');

export default function MediaViewer({ visible, onClose, imageUri }: MediaViewerProps) {
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
                            onPress={onClose}
                            style={styles.closeButton}
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
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
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
