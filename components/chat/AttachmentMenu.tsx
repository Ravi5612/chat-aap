import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AttachmentMenuProps {
    onLocation: () => void;
    onContact: () => void;
    onImage: () => void;
    onDocument: () => void;
}

export default function AttachmentMenu({ onLocation, onContact, onImage, onDocument }: AttachmentMenuProps) {
    const [visible, setVisible] = useState(false);

    const items = [
        { label: 'Document', icon: 'document-text', color: '#7C3AED', onPress: onDocument },
        { label: 'Camera', icon: 'camera', color: '#EC4899', onPress: onImage },
        { label: 'Gallery', icon: 'image', color: '#8B5CF6', onPress: onImage },
        { label: 'Audio', icon: 'headset', color: '#F59E0B', onPress: () => { } },
        { label: 'Location', icon: 'location', color: '#10B981', onPress: onLocation },
        { label: 'Contact', icon: 'person', color: '#3B82F6', onPress: onContact },
    ];

    return (
        <View>
            <TouchableOpacity
                onPress={() => setVisible(true)}
                className="p-2"
            >
                <Ionicons name="add-circle-outline" size={28} color="#F68537" />
            </TouchableOpacity>

            <Modal transparent visible={visible} animationType="fade">
                <TouchableWithoutFeedback onPress={() => setVisible(false)}>
                    <View className="flex-1 bg-black/20 justify-end pb-24">
                        <View className="bg-white mx-4 rounded-3xl p-4 flex-row flex-wrap justify-between">
                            {items.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => {
                                        item.onPress();
                                        setVisible(false);
                                    }}
                                    className="w-[30%] items-center mb-6"
                                >
                                    <View
                                        style={{ backgroundColor: item.color }}
                                        className="w-14 h-14 rounded-full items-center justify-center shadow-sm"
                                    >
                                        <Ionicons name={item.icon as any} size={26} color="white" />
                                    </View>
                                    <Text className="text-[11px] font-medium text-gray-500 mt-2">{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({});
