import React, { useEffect } from 'react';
import { View, TouchableOpacity, Text, Modal, TouchableWithoutFeedback, Dimensions, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming
} from 'react-native-reanimated';

const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥', '🙏'];

interface MessageContextMenuProps {
    visible: boolean;
    onClose: () => void;
    onSelectReaction: (emoji: string) => void;
    onAction: (action: string) => void;
    anchorY: number;
    isCurrentUser: boolean;
    canEdit?: boolean;
}

const { width, height } = Dimensions.get('window');

export default function MessageContextMenu({
    visible,
    onClose,
    onSelectReaction,
    onAction,
    anchorY,
    isCurrentUser,
    canEdit = false
}: MessageContextMenuProps) {
    const scale = useSharedValue(0.9);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            scale.value = withSpring(1, { damping: 15, stiffness: 150 });
            opacity.value = withTiming(1, { duration: 200 });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
            scale.value = withTiming(0.9, { duration: 150 });
            opacity.value = withTiming(0, { duration: 150 });
        }
    }, [visible]);

    if (!visible) return null;

    // Adjust Y if too low
    const menuHeight = 280;
    const adjustedY = anchorY + menuHeight > height ? anchorY - menuHeight : anchorY;

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value
    }));

    const ActionItem = ({ icon, label, onPress, color = "#475569", isLast = false, isDestructive = false }: any) => (
        <TouchableOpacity
            onPress={() => {
                Haptics.selectionAsync();
                onPress();
                onClose();
            }}
            style={[
                styles.actionItem,
                !isLast && styles.actionDivider,
                isDestructive && { backgroundColor: 'rgba(239, 68, 68, 0.05)' }
            ]}
        >
            <View style={[styles.iconContainer, isDestructive && { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Ionicons name={icon} size={18} color={isDestructive ? "#EF4444" : "#F68537"} />
            </View>
            <Text style={[styles.actionLabel, { color: isDestructive ? "#EF4444" : "#1E293B" }]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <Modal transparent visible={visible} animationType="none">
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <Animated.View
                        style={[
                            styles.menuContainer,
                            {
                                top: Math.max(20, adjustedY - 100),
                                right: isCurrentUser ? 20 : undefined,
                                left: !isCurrentUser ? 20 : undefined,
                            },
                            animatedStyle
                        ]}
                    >
                        {/* Reactions Bar */}
                        <View style={styles.reactionsBar}>
                            {REACTIONS.map((emoji) => (
                                <TouchableOpacity
                                    key={emoji}
                                    onPress={() => {
                                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                        onSelectReaction(emoji);
                                        onClose();
                                    }}
                                    style={styles.reactionButton}
                                >
                                    <Text style={styles.reactionText}>{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Actions List */}
                        <View style={styles.actionsList}>
                            <ActionItem icon="arrow-undo-outline" label="Reply" onPress={() => onAction('reply')} />
                            <ActionItem icon="copy-outline" label="Copy Text" onPress={() => onAction('copy')} />
                            <ActionItem icon="share-outline" label="Forward" onPress={() => onAction('forward')} />
                            {canEdit && <ActionItem icon="create-outline" label="Edit" onPress={() => onAction('edit')} />}
                            {canEdit && <ActionItem
                                icon="trash-outline"
                                label="Delete"
                                onPress={() => onAction('delete')}
                                isDestructive={true}
                                isLast={true}
                            />}
                        </View>
                    </Animated.View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    menuContainer: {
        position: 'absolute',
        width: 250,
        zIndex: 1000,
    },
    reactionsBar: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 40,
        padding: 8,
        paddingVertical: 10,
        marginBottom: 12,
        alignItems: 'center',
        justifyContent: 'space-around',
        borderWidth: 1.5,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    reactionButton: {
        paddingHorizontal: 4,
    },
    reactionText: {
        fontSize: 26,
    },
    actionsList: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    actionDivider: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.04)',
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(246, 133, 55, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    actionLabel: {
        fontSize: 15,
        fontWeight: '600',
    }
});
