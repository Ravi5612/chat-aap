import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system';

export const uploadChatMessageMedia = async (
    uri: string,
    type: 'image' | 'voice' | 'document' | 'video',
    userId: string,
    originalFileName?: string,
    mimeType?: string
) => {
    try {
        let fileName = `${Date.now()}`;
        let contentType = '';

        if (type === 'image') {
            fileName += '.jpg';
            contentType = 'image/jpeg';
        } else if (type === 'video') {
            fileName += '.mp4';
            contentType = 'video/mp4';
        } else if (type === 'voice') {
            fileName += '.m4a';
            contentType = 'audio/m4a';
        } else if (type === 'document') {
            fileName += `_${originalFileName || 'file'}`;
            fileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            contentType = mimeType || 'application/octet-stream';
        }

        const filePath = `${userId}/${fileName}`;

        // Get file info for size
        const fileInfo = await FileSystem.getInfoAsync(uri);
        const fileSize = fileInfo.exists ? fileInfo.size : 0;

        // Use fetch + arrayBuffer instead of base64 + Buffer to avoid OOM on large files
        const response = await fetch(uri);
        const arrayBuffer = await response.arrayBuffer();

        const { data, error } = await supabase.storage
            .from('chat-files')
            .upload(filePath, arrayBuffer, {
                contentType: contentType,
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            if (__DEV__) console.error('Upload error details:', error);
            throw error;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('chat-files')
            .getPublicUrl(filePath);

        return {
            url: publicUrl,
            name: originalFileName || fileName,
            type: contentType,
            size: fileSize
        };
    } catch (error) {
        if (__DEV__) console.error('Error in uploadChatMessageMedia:', error);
        throw error;
    }
};

export const uploadGroupAvatar = async (uri: string) => {
    try {
        const fileName = `group-avatars/${Date.now()}.jpg`;

        // Use fetch + arrayBuffer instead of base64 + Buffer to avoid OOM on large files
        const response = await fetch(uri);
        const arrayBuffer = await response.arrayBuffer();

        const { data, error } = await supabase.storage
            .from('chat-files')
            .upload(fileName, arrayBuffer, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            if (__DEV__) console.error('Group Avatar Upload error details:', error);
            throw error;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('chat-files')
            .getPublicUrl(fileName);

        return { url: publicUrl };
    } catch (error) {
        if (__DEV__) console.error('Error in uploadGroupAvatar:', error);
        throw error;
    }
};
