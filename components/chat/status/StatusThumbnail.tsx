import React from 'react';
import { View, Text, Image, ActivityIndicator } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
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
            <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                <Video
                    source={{ uri: mediaUrl || '' }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    isMuted={true}
                    status={{
                        shouldPlay: false,
                        positionMillis: 1000
                    } as any}
                />
                {isUploading ? (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                        <ActivityIndicator size="small" color="white" />
                    </View>
                ) : showPlayIcon ? (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                        <Ionicons name="play" size={18} color="white" />
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
