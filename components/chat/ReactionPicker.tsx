import React from 'react';
import { View, TouchableOpacity, Text, Modal, TouchableWithoutFeedback, Dimensions } from 'react-native';

const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥'];

interface ReactionPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (emoji: string) => void;
    anchorY: number;
    isCurrentUser: boolean;
}

const { width } = Dimensions.get('window');

export default function ReactionPicker({ visible, onClose, onSelect, anchorY, isCurrentUser }: ReactionPickerProps) {
    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="fade">
            <TouchableWithoutFeedback onPress={onClose}>
                <View className="flex-1 bg-black/10">
                    <View
                        style={{
                            position: 'absolute',
                            top: anchorY - 60,
                            right: isCurrentUser ? 20 : undefined,
                            left: !isCurrentUser ? 20 : undefined,
                            backgroundColor: 'white',
                            borderRadius: 30,
                            padding: 8,
                            flexDirection: 'row',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.25,
                            shadowRadius: 3.84,
                            elevation: 5,
                            zIndex: 1000
                        }}
                    >
                        {REACTIONS.map((emoji) => (
                            <TouchableOpacity
                                key={emoji}
                                onPress={() => {
                                    onSelect(emoji);
                                    onClose();
                                }}
                                className="px-2"
                            >
                                <Text className="text-2xl">{emoji}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
