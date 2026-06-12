import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useMessageMediaCache } from '@/hooks/useMessageMediaCache';

interface ReplyPreviewProps {
    replyingTo: any;
    onCancel: () => void;
}

// Sub-component to load and show image thumbnail
function ReplyImageThumb({ message }: { message: any }) {
    const { localImageUrl } = useMessageMediaCache(message);
    const uri = localImageUrl || message?.image_url;
    if (!uri) return <Ionicons name="image-outline" size={36} color="#F68537" />;
    return (
        <Image
            source={{ uri }}
            style={styles.thumb}
            contentFit="cover"
            cachePolicy="memory-disk"
        />
    );
}

export default React.memo(function ReplyPreview({ replyingTo, onCancel }: ReplyPreviewProps) {
    if (!replyingTo) return null;

    const isImage = replyingTo.message_type === 'image' || replyingTo.media_type === 'image' || !!replyingTo.image_url;
    const isVideo = replyingTo.message_type === 'video' || replyingTo.media_type === 'video';
    const isAudio = replyingTo.message_type === 'audio' || replyingTo.media_type === 'audio';
    const isDoc   = replyingTo.message_type === 'document' || replyingTo.media_type === 'document';

    const getPreviewText = () => {
        if (isImage) return '📷 Photo';
        if (isVideo) return '🎥 Video';
        if (isAudio) return '🎵 Voice message';
        if (isDoc)   return '📄 ' + (replyingTo.file_name || 'Document');
        // Plain text — but hide if it looks like an encrypted blob or a number
        const msg = replyingTo.message || '';
        if (!msg || msg.startsWith('{') || /^\d{8,}$/.test(msg)) return '💬 Message';
        return msg;
    };

    return (
        <View style={styles.container}>
            <View style={styles.contentWrapper}>
                <View style={styles.indicatorBar} />
                <View style={styles.textContainer}>
                    <Text style={styles.titleText}>Replying to...</Text>
                    <Text style={styles.messageText}>
                        {getPreviewText()}
                    </Text>
                </View>
                {/* Show thumbnail for images */}
                {isImage && (
                    <ReplyImageThumb message={replyingTo} />
                )}
                {/* Show video icon */}
                {isVideo && (
                    <View style={styles.mediaIconBox}>
                        <Ionicons name="videocam" size={22} color="white" />
                    </View>
                )}
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
        height: 44,
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
    },
    thumb: {
        width: 44,
        height: 44,
        borderRadius: 8,
        marginLeft: 8,
        backgroundColor: '#E5E7EB'
    },
    mediaIconBox: {
        width: 44,
        height: 44,
        borderRadius: 8,
        marginLeft: 8,
        backgroundColor: '#374151',
        alignItems: 'center',
        justifyContent: 'center'
    }
});
