import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ReplyPreviewProps {
    replyingTo: any;
    onCancel: () => void;
}

export default React.memo(function ReplyPreview({ replyingTo, onCancel }: ReplyPreviewProps) {
    if (!replyingTo) return null;

    return (
        <View style={styles.container}>
            <View style={styles.contentWrapper}>
                <View style={styles.indicatorBar} />
                <View style={styles.textContainer}>
                    <Text style={styles.titleText}>Replying to...</Text>
                    <Text style={styles.messageText} numberOfLines={1}>
                        {replyingTo.message || 'Media'}
                    </Text>
                </View>
            </View>
            <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(246, 133, 55, 0.3)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    contentWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8
    },
    indicatorBar: {
        width: 4,
        height: 40,
        backgroundColor: '#F68537',
        borderRadius: 9999,
        marginRight: 12
    },
    textContainer: {
        flex: 1
    },
    titleText: {
        fontSize: 12,
        color: '#F68537',
        fontWeight: 'bold',
        marginBottom: 2
    },
    messageText: {
        fontSize: 12,
        color: '#4B5563'
    },
    cancelBtn: {
        padding: 4
    }
});
