import React from 'react';
import { View, TouchableOpacity, Text, Modal, TouchableWithoutFeedback, Dimensions, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥'];

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
    if (!visible) return null;

    // Adjust Y if too low
    const menuHeight = 220;
    const adjustedY = anchorY + menuHeight > height ? anchorY - menuHeight : anchorY;

    const ActionItem = ({ icon, label, onPress, color = "#475569" }: any) => (
        <TouchableOpacity
            onPress={() => {
                onPress();
                onClose();
            }}
            className="flex-row items-center px-4 py-3 border-b border-gray-50"
        >
            <Ionicons name={icon} size={20} color={color} />
            <Text style={{ color }} className="ml-3 font-medium text-[15px]">{label}</Text>
        </TouchableOpacity>
    );

    return (
        <Modal transparent visible={visible} animationType="fade">
            <TouchableWithoutFeedback onPress={onClose}>
                <View className="flex-1 bg-black/20">
                    <View
                        style={{
                            position: 'absolute',
                            top: adjustedY - 70,
                            right: isCurrentUser ? 20 : undefined,
                            left: !isCurrentUser ? 20 : undefined,
                            width: 200,
                        }}
                    >
                        {/* Reactions Bar */}
                        <View className="bg-white rounded-full flex-row p-2 shadow-xl mb-2 items-center justify-around">
                            {REACTIONS.map((emoji) => (
                                <TouchableOpacity
                                    key={emoji}
                                    onPress={() => {
                                        onSelectReaction(emoji);
                                        onClose();
                                    }}
                                    className="px-1"
                                >
                                    <Text className="text-2xl">{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Actions List */}
                        <View className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                            <ActionItem icon="arrow-undo-outline" label="Reply" onPress={() => onAction('reply')} />
                            <ActionItem icon="copy-outline" label="Copy Text" onPress={() => onAction('copy')} />
                            <ActionItem icon="share-outline" label="Forward" onPress={() => onAction('forward')} />
                            {canEdit && <ActionItem icon="create-outline" label="Edit" onPress={() => onAction('edit')} />}
                            {canEdit && <ActionItem icon="trash-outline" label="Delete" onPress={() => onAction('delete')} color="#EF4444" />}
                        </View>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
