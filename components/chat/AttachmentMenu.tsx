import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AttachmentMenuProps {
    onLocation: () => void;
    onContact: () => void;
    onImage: () => void;
    onCamera: () => void;
    onDocument: () => void;
    onSchedule?: () => void;
    onGame?: (gameType: 'tictactoe' | 'chess' | 'ludo') => void;
    onCinema?: () => void;
}

// Static config outside component — never recreated
const MENU_ITEM_CONFIG = [
    { label: 'Document', icon: 'document-text', color: '#7C3AED', key: 'document' },
    { label: 'Camera',   icon: 'camera',         color: '#EC4899', key: 'camera' },
    { label: 'Gallery',  icon: 'image',           color: '#8B5CF6', key: 'image' },
    { label: 'Schedule', icon: 'time',            color: '#F59E0B', key: 'schedule' },
    { label: 'Location', icon: 'location',        color: '#10B981', key: 'location' },
    { label: 'Contact',  icon: 'person',          color: '#3B82F6', key: 'contact' },
    { label: 'Games',    icon: 'game-controller', color: '#EF4444', key: 'game' },
    { label: 'Cinema',   icon: 'film',            color: '#EAB308', key: 'cinema' },
] as const;

const AttachmentMenu = React.memo(({ onLocation, onContact, onImage, onCamera, onDocument, onSchedule, onGame, onCinema }: AttachmentMenuProps) => {
    const [visible, setVisible] = useState(false);
    const [gameMenuVisible, setGameMenuVisible] = useState(false);

    const open  = useCallback(() => setVisible(true),  []);
    const close = useCallback(() => setVisible(false), []);
    const closeGameMenu = useCallback(() => setGameMenuVisible(false), []);

    const handleGameClick = useCallback(() => {
        close();
        if (!onGame) return;
        setGameMenuVisible(true);
    }, [onGame, close]);

    // Map handlers once — only re-created if a handler prop changes
    const items = useMemo(() => [
        { ...MENU_ITEM_CONFIG[0], onPress: onDocument },
        { ...MENU_ITEM_CONFIG[1], onPress: onCamera },
        { ...MENU_ITEM_CONFIG[2], onPress: onImage },
        { ...MENU_ITEM_CONFIG[3], onPress: onSchedule ?? close },
        { ...MENU_ITEM_CONFIG[4], onPress: onLocation },
        { ...MENU_ITEM_CONFIG[5], onPress: onContact },
        { ...MENU_ITEM_CONFIG[6], onPress: handleGameClick },
        { ...MENU_ITEM_CONFIG[7], onPress: () => { close(); onCinema?.(); } },
    ], [onDocument, onCamera, onImage, onSchedule, onLocation, onContact, handleGameClick, onCinema, close]);

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

            <Modal transparent visible={gameMenuVisible} animationType="fade">
                <TouchableWithoutFeedback onPress={closeGameMenu}>
                    <View style={styles.overlayCentered}>
                        <TouchableWithoutFeedback>
                            <View style={styles.gameMenuCard}>
                                <Text style={styles.gameMenuTitle}>Choose a Game 🎮</Text>
                                
                                <TouchableOpacity style={styles.gameBtn} activeOpacity={0.7} onPress={() => { closeGameMenu(); onGame?.('tictactoe'); }}>
                                    <View style={[styles.gameIcon, { backgroundColor: '#3B82F6' }]}><Ionicons name="grid" size={24} color="white" /></View>
                                    <Text style={styles.gameText}>Tic-Tac-Toe</Text>
                                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.gameBtn} activeOpacity={0.7} onPress={() => { closeGameMenu(); onGame?.('chess'); }}>
                                    <View style={[styles.gameIcon, { backgroundColor: '#1E293B' }]}><Ionicons name="apps" size={24} color="white" /></View>
                                    <Text style={styles.gameText}>Chess (Shatranj)</Text>
                                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.gameBtn} activeOpacity={0.7} onPress={() => { closeGameMenu(); onGame?.('ludo'); }}>
                                    <View style={[styles.gameIcon, { backgroundColor: '#EF4444' }]}><Ionicons name="cube" size={24} color="white" /></View>
                                    <Text style={styles.gameText}>Ludo Multiplayer</Text>
                                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
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
    overlayCentered: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.4)', // Darker premium overlay
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    gameMenuCard: {
        backgroundColor: 'white',
        width: '100%',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
    },
    gameMenuTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0F172A',
        marginBottom: 20,
        textAlign: 'center',
    },
    gameBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    gameIcon: {
        width: 44, height: 44,
        borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 16,
    },
    gameText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#334155',
    }
});

export default AttachmentMenu;

