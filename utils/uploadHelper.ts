import { supabase } from '@/lib/supabase';
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system';

export const uploadChatMessageMedia = async (uri: string, type: 'image' | 'voice') => {
    try {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${type === 'image' ? 'jpg' : 'm4a'}`;
        const filePath = `${type}s/${fileName}`;

        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64',
        });

        const binaryData = Buffer.from(base64, 'base64');

        const { data, error } = await supabase.storage
            .from('chat-media')
            .upload(filePath, binaryData, {
                contentType: type === 'image' ? 'image/jpeg' : 'audio/m4a',
            });

        if (error) {
            // If bucket doesn't exist, we might need to handle it or assume it exists
            console.error('Upload error details:', error);
            throw error;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('chat-media')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error('Error in uploadChatMessageMedia:', error);
        throw error;
    }
};
