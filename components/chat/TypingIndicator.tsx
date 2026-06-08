import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
    friendName: string;
}

export const TypingIndicator: React.FC<Props> = ({ friendName }) => (
    <View style={styles.typingIndicatorContainer}>
        <View style={styles.typingBubble}>
            <Text style={styles.typingText}>{friendName} is typing...</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    typingIndicatorContainer: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        alignItems: 'flex-start'
    },
    typingBubble: {
        backgroundColor: 'rgba(255,255,255,0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderBottomLeftRadius: 4,
    },
    typingText: {
        fontSize: 12,
        color: '#F68537',
        fontStyle: 'italic',
        fontWeight: 'bold'
    }
});
