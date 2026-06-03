import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const NOOP = () => {};

interface ChatMenuProps {
    visible: boolean;
    onClose: () => void;
    onViewProfile: () => void;
    onGroupInfo: () => void;
    onClearChat: () => void;
    onBlockUser: () => void;
    onUnfriend: () => void;
    isBlocked: boolean;
    isMember: boolean;
    isGroup: boolean;
    onLeaveGroup: () => void;
    onSetWallpaper: () => void;
    onLedger: () => void;
    onSetDisappearingMessages: () => void;
    onViewScheduledMessages?: () => void;
}

// ─── MenuItem sub-component ────────────────────────────────────────────────────
interface MenuItemProps {
    label: string;
    icon: string;
    color: string;
    onPress: () => void;
    onClose: () => void;
    isDanger?: boolean;
}

const MenuItem = memo(({ label, icon, color, onPress, onClose, isDanger }: MenuItemProps) => {
    const handlePress = useCallback(() => {
        onPress();
        onClose();
    }, [onPress, onClose]);

    return (
        <TouchableOpacity onPress={handlePress} style={styles.menuItem}>
            <View style={styles.iconWrapper}>
                <Ionicons name={icon as any} size={22} color={color} />
            </View>
            <Text style={[styles.menuLabel, isDanger && { color }]}>{label}</Text>
        </TouchableOpacity>
    );
});

// ─── Main ChatMenu ─────────────────────────────────────────────────────────────
const ChatMenu = memo(({
    visible,
    onClose,
    onViewProfile,
    onGroupInfo,
    onClearChat,
    onBlockUser,
    onUnfriend,
    isBlocked,
    isGroup,
    onLeaveGroup,
    onSetWallpaper,
    onLedger,
    onSetDisappearingMessages,
    onViewScheduledMessages,
}: ChatMenuProps) => {
    if (!visible) return null;

    const mainItems = useMemo(() => [
        { key: 'profile',    label: isGroup ? 'Group Info' : 'View Profile', icon: isGroup ? 'information-circle-outline' : 'person-outline', onPress: isGroup ? onGroupInfo : onViewProfile, color: '#F68537' },
        { key: 'ledger',     label: 'Hisab-Kitab 💸',             icon: 'book-outline',    onPress: onLedger,                  color: '#F68537' },
        { key: 'mute',       label: 'Mute Notifications',         icon: 'volume-mute-outline', onPress: NOOP,                  color: '#F68537' },
        { key: 'wallpaper',  label: 'Set Wallpaper',              icon: 'image-outline',   onPress: onSetWallpaper,            color: '#F68537' },
        { key: 'clear',      label: 'Clear Chat',                 icon: 'trash-outline',   onPress: onClearChat,              color: '#F68537' },
        { key: 'disappear',  label: 'Disappearing Messages ⏳',   icon: 'timer-outline',   onPress: onSetDisappearingMessages, color: '#F59E0B' },
        { key: 'scheduled',  label: 'Scheduled Messages ⏰',      icon: 'calendar-outline', onPress: onViewScheduledMessages ?? NOOP, color: '#8B5CF6' },
    ], [isGroup, onGroupInfo, onViewProfile, onLedger, onSetWallpaper, onClearChat, onSetDisappearingMessages, onViewScheduledMessages]);

    const dangerItems = useMemo(() => {
        const items: { key: string; label: string; icon: string; onPress: () => void; color: string }[] = [];
        if (!isGroup) {
            items.push({ key: 'unfriend', label: 'Unfriend',                              icon: 'person-remove-outline', onPress: onUnfriend, color: '#EF4444' });
            items.push({ key: 'block',    label: isBlocked ? 'Unblock User' : 'Block User', icon: 'ban-outline',         onPress: onBlockUser, color: '#EF4444' });
        }
        if (isGroup) {
            items.push({ key: 'leave',   label: 'Leave Group',  icon: 'log-out-outline', onPress: onLeaveGroup, color: '#EF4444' });
        }
        items.push({ key: 'report', label: 'Report User', icon: 'warning-outline', onPress: NOOP, color: '#EF4444' });
        return items;
    }, [isGroup, isBlocked, onUnfriend, onBlockUser, onLeaveGroup]);

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.menuCard}>
                            <View style={styles.section}>
                                {mainItems.map(item => (
                                    <MenuItem key={item.key} {...item} onClose={onClose} />
                                ))}

                                <View style={styles.divider} />

                                {dangerItems.map(item => (
                                    <MenuItem key={item.key} {...item} onClose={onClose} isDanger />
                                ))}
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
});

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' },
    menuCard: {
        position: 'absolute', top: 60, right: 16,
        backgroundColor: 'white', borderRadius: 24, width: 230,
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
        borderWidth: 1.5, borderColor: '#F68537', overflow: 'hidden',
    },
    section: { paddingVertical: 8 },
    menuItem: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 14,
    },
    iconWrapper: { width: 32 },
    menuLabel: { marginLeft: 8, fontSize: 16, fontWeight: '600', color: '#374151' },
    divider: { height: 1, backgroundColor: '#F6853740', marginHorizontal: 16, marginVertical: 4 },
});

export default ChatMenu;




