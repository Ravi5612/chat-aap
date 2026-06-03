import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AttachmentMenuProps {
    onLocation: () => void;
    onContact: () => void;
    onImage: () => void;
    onCamera: () => void;
    onDocument: () => void;
    onSchedule?: () => void;
}

// Static config outside component — never recreated
const MENU_ITEM_CONFIG = [
    { label: 'Document', icon: 'document-text', color: '#7C3AED', key: 'document' },
    { label: 'Camera',   icon: 'camera',         color: '#EC4899', key: 'camera' },
    { label: 'Gallery',  icon: 'image',           color: '#8B5CF6', key: 'image' },
    { label: 'Schedule', icon: 'time',            color: '#F59E0B', key: 'schedule' },
    { label: 'Location', icon: 'location',        color: '#10B981', key: 'location' },
    { label: 'Contact',  icon: 'person',          color: '#3B82F6', key: 'contact' },
] as const;

const AttachmentMenu = React.memo(({ onLocation, onContact, onImage, onCamera, onDocument, onSchedule }: AttachmentMenuProps) => {
    const [visible, setVisible] = useState(false);

    const open  = useCallback(() => setVisible(true),  []);
    const close = useCallback(() => setVisible(false), []);

    // Map handlers once — only re-created if a handler prop changes
    const items = useMemo(() => [
        { ...MENU_ITEM_CONFIG[0], onPress: onDocument },
        { ...MENU_ITEM_CONFIG[1], onPress: onCamera },
        { ...MENU_ITEM_CONFIG[2], onPress: onImage },
        { ...MENU_ITEM_CONFIG[3], onPress: onSchedule ?? close },
        { ...MENU_ITEM_CONFIG[4], onPress: onLocation },
        { ...MENU_ITEM_CONFIG[5], onPress: onContact },
    ], [onDocument, onCamera, onImage, onSchedule, onLocation, onContact, close]);

    return (
        <View>
            <TouchableOpacity onPress={open} style={styles.openBtn}>
                <Ionicons name="add" size={28} color="#F68537" />
            </TouchableOpacity>

            <Modal transparent visible={visible} animationType="fade">
                <TouchableWithoutFeedback onPress={close}>
                    <View style={styles.overlay}>
                        <View style={styles.menuCard}>
                            {items.map((item) => (
                                <TouchableOpacity
                                    key={item.key}
                                    onPress={() => { item.onPress(); close(); }}
                                    style={styles.menuItem}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
                                        <Ionicons name={item.icon as any} size={26} color="white" />
                                    </View>
                                    <Text style={styles.itemLabel}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
});

const styles = StyleSheet.create({
    openBtn: { paddingLeft: 12, paddingRight: 8, paddingVertical: 8 },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'flex-end',
        paddingBottom: 96,
    },
    menuCard: {
        backgroundColor: 'white',
        marginHorizontal: 16,
        borderRadius: 24,
        padding: 16,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    menuItem: { width: '30%', alignItems: 'center', marginBottom: 24 },
    iconCircle: {
        width: 56, height: 56, borderRadius: 28,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
    },
    itemLabel: { fontSize: 11, fontWeight: '500', color: '#6B7280', marginTop: 8 },
});

export default AttachmentMenu;

