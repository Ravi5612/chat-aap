import React, { useCallback } from 'react';
import { View, TouchableOpacity, Text, Modal, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥'];

interface ReactionPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (emoji: string) => void;
    anchorY: number;
    isCurrentUser: boolean;
}

const EmojiButton = React.memo(({ emoji, onSelect, onClose }: { emoji: string, onSelect: (e: string) => void, onClose: () => void }) => {
    const handlePress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect(emoji);
        onClose();
    }, [emoji, onSelect, onClose]);

    return (
        <TouchableOpacity onPress={handlePress} style={styles.emojiBtn}>
            <Text style={styles.emojiText}>{emoji}</Text>
        </TouchableOpacity>
    );
});

export default React.memo(function ReactionPicker({ visible, onClose, onSelect, anchorY, isCurrentUser }: ReactionPickerProps) {
    // Modal should always render in the tree to allow native fade out animations.
    // React Native's <Modal visible={visible}> handles showing/hiding natively.

    return (
        <Modal transparent visible={visible} animationType="fade">
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View
                            style={[
                                styles.popup,
                                {
                                    top: anchorY - 60,
                                    right: isCurrentUser ? 20 : undefined,
                                    left: !isCurrentUser ? 20 : undefined,
                                }
                            ]}
                        >
                            {REACTIONS.map((emoji) => (
                                <EmojiButton 
                                    key={emoji} 
                                    emoji={emoji} 
                                    onSelect={onSelect} 
                                    onClose={onClose} 
                                />
                            ))}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
});

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    popup: {
        position: 'absolute',
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
    },
    emojiBtn: {
        paddingHorizontal: 8,
    },
    emojiText: {
        fontSize: 24,
    }
});
