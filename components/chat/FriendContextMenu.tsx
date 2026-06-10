import React, { useCallback, memo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FriendContextMenuProps {
    visible: boolean;
    friend: any;
    onClose: () => void;
    onAction: (action: string, friend: any) => void;
}

const FriendContextMenu = memo(({ visible, friend, onClose, onAction }: FriendContextMenuProps) => {
    
    const handleMenuAction = useCallback((actionType: string) => {
        onAction(actionType, friend);
        onClose();
    }, [onAction, friend, onClose]);

    if (!friend) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.menuContainer}>
                            {/* Header */}
                            <View style={styles.header}>
                                <Text style={styles.friendName} numberOfLines={1}>{friend.name}</Text>
                                <Text style={styles.friendEmail} numberOfLines={1}>{friend.email || 'Email hidden'}</Text>
                            </View>

                            {/* Actions */}
                            <View style={styles.actionList}>
                                {[
                                    { id: 'profile', icon: 'person-outline', label: 'View Profile', action: 'profile' },
                                    { id: 'group', icon: 'people-outline', label: friend.isGroup ? 'Manage Members' : 'Create Group with User', action: 'group' },
                                    { id: 'favorite', icon: friend.isFavourite ? "star" : "star-outline", color: friend.isFavourite ? "#FBBF24" : undefined, label: friend.isFavourite ? 'Remove from Favourites' : 'Add to Favourites', action: 'favorite' },
                                    { id: 'archive', icon: 'archive-outline', label: friend.isArchived ? 'Unarchive Chat' : 'Archive Chat', action: 'archive' },
                                    { id: 'lock', icon: friend.isLocked ? "lock-open-outline" : "lock-closed-outline", label: friend.isLocked ? 'Unlock Chat' : 'Lock Chat', action: friend.isLocked ? 'unlock' : 'lock' },
                                    { id: 'hide', icon: friend.isHidden ? "eye-outline" : "eye-off-outline", label: friend.isHidden ? 'Unhide Chat' : 'Hide Chat (Ninja Vault)', action: friend.isHidden ? 'unhide' : 'hide' },
                                    { id: 'block', icon: friend.isBlocked ? "checkmark-circle-outline" : "ban-outline", color: friend.isBlocked ? "#10B981" : "#EF4444", textStyle: friend.isBlocked ? styles.colorGreen : styles.colorRed, label: friend.isBlocked ? 'Unblock User' : 'Block User', action: friend.isBlocked ? 'unblock' : 'block' },
                                    { id: 'divider', isDivider: true },
                                    ...((!friend.isGroup && !friend.isUnfriended) ? [{ id: 'unfriend', icon: 'person-remove-outline', color: '#EF4444', textStyle: styles.colorRed, label: 'Unfriend', action: 'unfriend' }] : []),
                                    { id: 'delete', icon: 'trash-outline', color: '#EF4444', textStyle: styles.colorRed, label: 'Delete Chat', action: 'delete' }
                                ].map((item: any) => {
                                    if (item.isDivider) {
                                        return <View key={item.id} style={styles.divider} />;
                                    }
                                    return (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={styles.actionItem}
                                            onPress={() => handleMenuAction(item.action)}
                                        >
                                            <Ionicons name={item.icon} size={20} color={item.color || "#4B5563"} />
                                            <Text style={[styles.actionText, item.textStyle]}>{item.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Close Button */}
                            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                <Text style={styles.closeButtonText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
});

export default FriendContextMenu;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    menuContainer: {
        backgroundColor: 'white',
        borderRadius: 16,
        width: '100%',
        maxWidth: 320,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    header: {
        padding: 20,
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    friendName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    friendEmail: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    actionList: {
        paddingVertical: 8,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 12,
    },
    actionText: {
        fontSize: 16,
        color: '#374151',
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 8,
    },
    closeButton: {
        padding: 16,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#F68537',
    },
    colorRed: {
        color: '#EF4444',
    },
    colorGreen: {
        color: '#10B981',
    }
});
