import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FriendContextMenuProps {
    visible: boolean;
    friend: any;
    onClose: () => void;
    onAction: (action: string, friend: any) => void;
}

export default function FriendContextMenu({ visible, friend, onClose, onAction }: FriendContextMenuProps) {
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
                                <TouchableOpacity
                                    style={styles.actionItem}
                                    onPress={() => { onAction('profile', friend); onClose(); }}
                                >
                                    <Ionicons name="person-outline" size={20} color="#4B5563" />
                                    <Text style={styles.actionText}>View Profile</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionItem}
                                    onPress={() => { onAction('group', friend); onClose(); }}
                                >
                                    <Ionicons name="people-outline" size={20} color="#4B5563" />
                                    <Text style={styles.actionText}>{friend.isGroup ? 'Manage Members' : 'Add to Group'}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionItem}
                                    onPress={() => { onAction('favorite', friend); onClose(); }}
                                >
                                    <Ionicons name={friend.isFavourite ? "star" : "star-outline"} size={20} color={friend.isFavourite ? "#FBBF24" : "#4B5563"} />
                                    <Text style={styles.actionText}>{friend.isFavourite ? 'Remove from Favourites' : 'Add to Favourites'}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionItem}
                                    onPress={() => { onAction('archive', friend); onClose(); }}
                                >
                                    <Ionicons name="archive-outline" size={20} color="#4B5563" />
                                    <Text style={styles.actionText}>{friend.isArchived ? 'Unarchive Chat' : 'Archive Chat'}</Text>
                                </TouchableOpacity>

                                <View style={styles.divider} />

                                <TouchableOpacity
                                    style={styles.actionItem}
                                    onPress={() => { onAction('delete', friend); onClose(); }}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete Chat</Text>
                                </TouchableOpacity>
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
}

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
});
