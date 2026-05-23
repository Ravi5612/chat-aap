import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface MessageStatusContextProps {
    statusContext: any;
    isCurrentUser: boolean;
    decryptedStatusContent: string | null;
    decryptedStatusMedia: string | null;
}

export default function MessageStatusContext({
    statusContext,
    isCurrentUser,
    decryptedStatusContent,
    decryptedStatusMedia
}: MessageStatusContextProps) {
    const router = useRouter();

    if (!statusContext) return null;

    return (
        <TouchableOpacity
            onPress={(e) => {
                e.stopPropagation();
                Haptics.selectionAsync();
                router.push(`/status/viewer?userId=${statusContext.user_id}`);
            }}
            activeOpacity={0.7}
            style={{
                margin: 6,
                padding: 8,
                borderRadius: 8,
                borderLeftWidth: 3,
                backgroundColor: isCurrentUser ? 'rgba(0, 0, 0, 0.1)' : 'rgba(246, 133, 55, 0.05)',
                borderLeftColor: '#10B981',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                minWidth: 200
            }}
        >
            <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '900', fontSize: 10, color: '#10B981', marginBottom: 2, textTransform: 'uppercase' }}>
                    Status Reply
                </Text>
                <Text style={{ fontSize: 12, color: isCurrentUser ? 'rgba(255, 255, 255, 0.9)' : '#4B5563' }} numberOfLines={2}>
                    {statusContext.media_type === 'text'
                        ? (decryptedStatusContent || '...')
                        : (statusContext.caption || 'Media Status')}
                </Text>
            </View>
            {statusContext.media_type !== 'text' && (decryptedStatusMedia || statusContext.media_url) && (
                <Image
                    source={{ uri: decryptedStatusMedia || statusContext.media_url }}
                    style={{ width: 44, height: 44, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.1)' }}
                    contentFit="cover"
                />
            )}
        </TouchableOpacity>
    );
}
