import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface MessageStatusContextProps {
    statusContext: any;
    isCurrentUser: boolean;
    decryptedStatusContent: string | null;
    decryptedStatusMedia: string | null;
}

export default React.memo(function MessageStatusContext({
    statusContext,
    isCurrentUser,
    decryptedStatusContent,
    decryptedStatusMedia
}: MessageStatusContextProps) {
    const router = useRouter();

    const handlePress = useCallback((e: any) => {
        e.stopPropagation();
        Haptics.selectionAsync();
        router.push(`/status/viewer?userId=${statusContext?.user_id}`);
    }, [router, statusContext?.user_id]);

    if (!statusContext) return null;

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            style={[
                styles.container,
                { backgroundColor: isCurrentUser ? 'rgba(0, 0, 0, 0.1)' : 'rgba(246, 133, 55, 0.05)' }
            ]}
        >
            <View style={styles.textWrapper}>
                <Text style={styles.titleText}>
                    Status Reply
                </Text>
                <Text style={[styles.messageText, { color: isCurrentUser ? 'rgba(255, 255, 255, 0.9)' : '#4B5563' }]} numberOfLines={2}>
                    {statusContext.media_type === 'text'
                        ? (decryptedStatusContent || '...')
                        : (statusContext.caption || 'Media Status')}
                </Text>
            </View>
            {statusContext.media_type !== 'text' && (decryptedStatusMedia || statusContext.media_url) && (
                <Image
                    source={{ uri: decryptedStatusMedia || statusContext.media_url }}
                    style={styles.image}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                />
            )}
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        margin: 6,
        padding: 8,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#10B981',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        minWidth: 200
    },
    textWrapper: {
        flex: 1
    },
    titleText: {
        fontWeight: '900',
        fontSize: 10,
        color: '#10B981',
        marginBottom: 2,
        textTransform: 'uppercase'
    },
    messageText: {
        fontSize: 12
    },
    image: {
        width: 44,
        height: 44,
        borderRadius: 6,
        backgroundColor: 'rgba(0,0,0,0.1)'
    }
});
