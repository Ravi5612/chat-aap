import { supabase } from '@/lib/supabase';
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system';

export const uploadChatMessageMedia = async (uri: string, type: 'image' | 'voice', userId: string) => {
    try {
        const fileExt = type === 'image' ? 'jpg' : 'm4a';
        const fileName = `${Date.now()}.${fileExt}`;
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
                contentType: type === 'image' ? 'image/jpeg' : 'audio/m4a',
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
            name: fileName,
            type: type === 'image' ? 'image/jpeg' : 'audio/m4a',
            size: fileSize
        };
    } catch (error) {
        console.error('Error in uploadChatMessageMedia:', error);
        throw error;
    }
};
