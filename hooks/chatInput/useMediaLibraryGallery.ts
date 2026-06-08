import { useState, useEffect, useCallback } from 'react';
import * as MediaLibrary from 'expo-media-library';

export const useMediaLibraryGallery = (visible: boolean) => {
    const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

    useEffect(() => {
        if (visible && permissionResponse?.status === 'granted') {
            loadAssets();
        }
    }, [visible, permissionResponse]);

    useEffect(() => {
        if (visible && !permissionResponse?.granted && permissionResponse?.canAskAgain) {
            requestPermission();
        }
    }, [visible]);

    const loadAssets = async () => {
        try {
            const media = await MediaLibrary.getAssetsAsync({
                mediaType: ['photo', 'video'],
                first: 100,
                sortBy: ['creationTime'],
            });
            setAssets(media.assets);
        } catch (error) {
            console.log('Error fetching media:', error);
        }
    };

    const formatTime = useCallback((seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }, []);

    return { assets, formatTime };
};
