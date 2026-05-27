import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface StatusThumbnailProps {
    mediaType: 'text' | 'video' | 'image' | string;
    mediaUrl?: string;
    text?: string;
    bgColor?: string;
    isUploading?: boolean;
    showPlayIcon?: boolean;
}

export default function StatusThumbnail({
    mediaType,
    mediaUrl,
    text,
    bgColor,
    isUploading,
    showPlayIcon
}: StatusThumbnailProps) {
    if (mediaType === 'text') {
        return (
            <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: bgColor || '#F68537', padding: 4 }}>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 10, textAlign: 'center' }} numberOfLines={3}>
                    {text || 'T'}
                </Text>
                {isUploading && (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator size="small" color="white" />
                    </View>
                )}
            </View>
        );
    }

    if (mediaType === 'video') {
        return (
            <View style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
                {mediaUrl && mediaUrl !== '' && !mediaUrl.startsWith('{') ? (
                    <>
                        <Image source={{ uri: mediaUrl }} style={{ width: '100%', height: '100%', position: 'absolute' }} />
                        <View style={{ position: 'absolute', backgroundColor: 'rgba(0,0,0,0.3)', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="play" size={14} color="white" />
                        </View>
                    </>
                ) : (
                    <Ionicons name="videocam" size={24} color="white" />
                )}
                {isUploading ? (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                        <ActivityIndicator size="small" color="white" />
                    </View>
                ) : null}
            </View>
        );
    }

    return (
        <View style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Image
                source={{ uri: mediaUrl || '' }}
                style={{ width: '100%', height: '100%' }}
            />
            {isUploading && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <ActivityIndicator size="small" color="white" />
                </View>
            )}
        </View>
    );
}
