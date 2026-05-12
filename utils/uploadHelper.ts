import { supabase } from '@/lib/supabase';
import { Buffer } from 'buffer';
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
            // Clean up fileName to avoid spaces and weird characters causing URL issues
            fileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            contentType = mimeType || 'application/octet-stream';
        }

        const filePath = `${userId}/${fileName}`;

        // Get file info for size
        const fileInfo = await FileSystem.getInfoAsync(uri);
        const fileSize = fileInfo.exists ? fileInfo.size : 0;

        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64',
        });

        const binaryData = Buffer.from(base64, 'base64');

        const { data, error } = await supabase.storage
            .from('chat-files')
            .upload(filePath, binaryData, {
                contentType: contentType,
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Upload error details:', error);
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
        console.error('Error in uploadChatMessageMedia:', error);
        throw error;
    }
};

export const uploadGroupAvatar = async (uri: string) => {
    try {
        const fileName = `group-avatars/${Date.now()}.jpg`;

        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64',
        });

        const binaryData = Buffer.from(base64, 'base64');

        const { data, error } = await supabase.storage
            .from('chat-files')
            .upload(fileName, binaryData, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Group Avatar Upload error details:', error);
            throw error;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('chat-files')
            .getPublicUrl(fileName);

        return { url: publicUrl };
    } catch (error) {
        console.error('Error in uploadGroupAvatar:', error);
        throw error;
    }
};
