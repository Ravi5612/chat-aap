import { useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import { getMediaCache, saveMediaCache } from '@/lib/localDb';
import { useDbStore } from '@/store/useDbStore';

export function useMessageMediaCache(message: any, imageUrl: string | null, voiceUri: string | null) {
    const isLocalImageInitial = imageUrl?.startsWith('file://') || imageUrl?.startsWith('content://') || imageUrl?.startsWith('file:/') || imageUrl?.startsWith('data:image/');
    
    const [localImageUrl, setLocalImageUrl] = useState<string | null>(isLocalImageInitial ? imageUrl : null);
    const [localVoiceUrl, setLocalVoiceUrl] = useState<string | null>(null);
    const [imageLoading, setImageLoading] = useState(!isLocalImageInitial && !!imageUrl);

    useEffect(() => {
        const handleMediaCache = async () => {
            const { db } = useDbStore.getState();
            if (!db) return;

            const isLocalImage = imageUrl?.startsWith('file://') || imageUrl?.startsWith('content://') || imageUrl?.startsWith('file:/') || imageUrl?.startsWith('data:image/');
            if (imageUrl && !isLocalImage) {
                const cached = await getMediaCache(db, imageUrl);
                if (cached) {
                    setLocalImageUrl(cached);
                    setImageLoading(false);
                } else {
                    try {
                        const filename = (typeof imageUrl === 'string' ? imageUrl.split('/').pop() : null) || 'media.jpg';
                        const localUri = `${FileSystem.cacheDirectory}${filename}`;
                        const download = await FileSystem.downloadAsync(imageUrl, localUri);
                        if (download.status === 200) {
                            await saveMediaCache(db, imageUrl, download.uri, 'image');
                            setLocalImageUrl(download.uri);
                            setImageLoading(false);
                        }
                    } catch (e) {
                        setImageLoading(false);
                    }
                }
            } else if (isLocalImage) {
                setImageLoading(false);
            }

            if (voiceUri && !voiceUri.startsWith('file://')) {
                const cached = await getMediaCache(db, voiceUri);
                if (cached) {
                    setLocalVoiceUrl(cached);
                } else {
                    try {
                        const filename = (typeof voiceUri === 'string' ? voiceUri.split('/').pop() : null) || 'voice.m4a';
                        const localUri = `${FileSystem.cacheDirectory}${filename}`;
                        const download = await FileSystem.downloadAsync(voiceUri, localUri);
                        if (download.status === 200) {
                            await saveMediaCache(db, voiceUri, download.uri, 'audio');
                            setLocalVoiceUrl(download.uri);
                        }
                    } catch (e) {
                        console.error('[CACHE] Voice download failed:', e);
                    }
                }
            }
        };

        handleMediaCache();
    }, [imageUrl, voiceUri]);

    return { localImageUrl, localVoiceUrl, imageLoading, setImageLoading };
}
