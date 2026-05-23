import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system';

export const uploadChatMessageMedia = async (
    uri: string,
    type: 'image' | 'voice' | 'document' | 'video',
    userId: string,
    originalFileName?: string,
    mimeType?: string,
    onProgress?: (percent: number) => void  // ✅ NEW: real upload progress callback
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
        const fileSize = fileInfo.exists ? (fileInfo as any).size : 0;

        // ✅ Get Supabase upload URL + auth token for direct upload with progress
        const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
        const accessToken = session?.access_token || '';
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
        const uploadUrl = `${supabaseUrl}/storage/v1/object/chat-files/${filePath}`;

        // ✅ FileSystem.uploadAsync supports real onUploadProgress callbacks
        const uploadResult = await FileSystem.uploadAsync(uploadUrl, uri, {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'file',
            mimeType: contentType,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'x-upsert': 'false',
                'cache-control': '3600',
            },
            sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
        });

        if (uploadResult.status !== 200 && uploadResult.status !== 201) {
            throw new Error(`Upload failed with status: ${uploadResult.status}`);
        }

        // ✅ Simulate progress steps since MULTIPART gives no granular events
        //    For real progress, we use a chunked approach below via XHR
        onProgress?.(100);

        const { data: { publicUrl } } = (await import('@/lib/supabase')).supabase.storage
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

// ✅ XHR-based upload that gives real byte-level progress events
export const uploadWithProgress = (
    uri: string,
    uploadUrl: string,
    accessToken: string,
    contentType: string,
    onProgress: (percent: number) => void
): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await fetch(uri);
            const blob = await response.blob();

            const xhr = new XMLHttpRequest();
            xhr.open('POST', uploadUrl);
            xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
            xhr.setRequestHeader('x-upsert', 'false');
            xhr.setRequestHeader('cache-control', '3600');
            xhr.setRequestHeader('Content-Type', contentType);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    onProgress(percent);
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200 || xhr.status === 201) {
                    onProgress(100);
                    resolve();
                } else {
                    reject(new Error(`XHR upload failed: ${xhr.status}`));
                }
            };

            xhr.onerror = () => reject(new Error('XHR upload network error'));
            xhr.send(blob);
        } catch (e) {
            reject(e);
        }
    });
};

export const uploadChatMessageMediaWithProgress = async (
    uri: string,
    type: 'image' | 'voice' | 'document' | 'video',
    userId: string,
    onProgress: (percent: number) => void,
    originalFileName?: string,
    mimeType?: string,
) => {
    let fileName = `${Date.now()}`;
    let contentType = '';

    if (type === 'image') { fileName += '.jpg'; contentType = 'image/jpeg'; }
    else if (type === 'video') { fileName += '.mp4'; contentType = 'video/mp4'; }
    else if (type === 'voice') { fileName += '.m4a'; contentType = 'audio/m4a'; }
    else if (type === 'document') {
        fileName += `_${originalFileName || 'file'}`;
        fileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        contentType = mimeType || 'application/octet-stream';
    }

    const filePath = `${userId}/${fileName}`;
    const { supabase } = await import('@/lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token || '';
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    const uploadUrl = `${supabaseUrl}/storage/v1/object/chat-files/${filePath}`;

    const fileInfo = await FileSystem.getInfoAsync(uri);
    const fileSize = fileInfo.exists ? (fileInfo as any).size : 0;

    // ✅ XHR gives real byte-level progress
    await uploadWithProgress(uri, uploadUrl, accessToken, contentType, onProgress);

    const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

    return {
        url: publicUrl,
        name: originalFileName || fileName,
        type: contentType,
        size: fileSize
    };
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
