import React from 'react';
import { View, Modal, Image, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MediaViewerProps {
    visible: boolean;
    onClose: () => void;
    imageUri: string | null;
}

const { width, height } = Dimensions.get('window');

export default function MediaViewer({ visible, onClose, imageUri }: MediaViewerProps) {
    if (!visible || !imageUri) return null;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <SafeAreaView className="flex-1 bg-black">
                <View className="flex-1 items-center justify-center">
                    <TouchableOpacity
                        onPress={onClose}
                        className="absolute top-12 right-6 z-50 bg-black/50 p-2 rounded-full"
                    >
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>

                    <Image
                        source={{ uri: imageUri }}
                        className="w-full h-full"
                        resizeMode="contain"
                    />
                </View>
            </SafeAreaView>
        </Modal>
    );
}
