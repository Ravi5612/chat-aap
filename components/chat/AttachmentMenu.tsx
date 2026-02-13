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
                style={{ paddingLeft: 12, paddingRight: 8, paddingVertical: 8 }}
            >
                <Ionicons name="add" size={28} color="#F68537" />
            </TouchableOpacity>

            <Modal transparent visible={visible} animationType="fade">
                <TouchableWithoutFeedback onPress={() => setVisible(false)}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.2)', justifyContent: 'flex-end', paddingBottom: 96 }}>
                        <View style={{ backgroundColor: 'white', marginHorizontal: 16, borderRadius: 24, padding: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                            {items.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => {
                                        item.onPress();
                                        setVisible(false);
                                    }}
                                    style={{ width: '30%', alignItems: 'center', marginBottom: 24 }}
                                >
                                    <View
                                        style={{
                                            backgroundColor: item.color,
                                            width: 56,
                                            height: 56,
                                            borderRadius: 28,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            shadowColor: '#000',
                                            shadowOffset: { width: 0, height: 1 },
                                            shadowOpacity: 0.05,
                                            shadowRadius: 2,
                                            elevation: 2
                                        }}
                                    >
                                        <Ionicons name={item.icon as any} size={26} color="white" />
                                    </View>
                                    <Text style={{ fontSize: 11, fontWeight: '500', color: '#6B7280', marginTop: 8 }}>{item.label}</Text>
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
