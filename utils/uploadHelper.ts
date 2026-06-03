import * as FileSystem from 'expo-file-system';
import { gcm } from '@noble/ciphers/aes.js';
import * as Crypto from 'expo-crypto';
import { Buffer } from 'buffer';

export const encryptFileBase64 = async (base64: string, cryptoKey: Uint8Array): Promise<string> => {
    const iv = Crypto.getRandomBytes(12);
    const aes = gcm(new Uint8Array(cryptoKey), new Uint8Array(iv));
    const encrypted = aes.encrypt(new Uint8Array(Buffer.from(base64, 'utf8')));
    
    return JSON.stringify({
        iv: Buffer.from(iv).toString('base64'),
        content: Buffer.from(encrypted).toString('base64'),
    });
};

export const decryptFileBase64 = async (encryptedData: string, cryptoKey: Uint8Array): Promise<string> => {
    const dataToDecrypt = JSON.parse(encryptedData);
    const iv = new Uint8Array(Buffer.from(dataToDecrypt.iv, 'base64'));
    const content = new Uint8Array(Buffer.from(dataToDecrypt.content, 'base64'));
    
    const aes = gcm(new Uint8Array(cryptoKey), iv);
    const decrypted = aes.decrypt(content);
    
    return Buffer.from(decrypted).toString('utf8');
};

export const uploadChatMessageMedia = async (
    uri: string,
    type: 'image' | 'voice' | 'document' | 'video',
    userId: string,
    originalFileName?: string,
    mimeType?: string,
    onProgress?: (percent: number) => void,
    chatKey?: Uint8Array
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

        // Get file info for size
        const fileInfo = await FileSystem.getInfoAsync(uri);
        const fileSize = fileInfo.exists ? (fileInfo as any).size : 0;

        let fileToUpload = uri;

        if (chatKey) {
            // Encrypt the file before uploading
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
            const encryptedText = await encryptFileBase64(base64, chatKey);
            
            const tempUri = `${FileSystem.cacheDirectory}enc_${Date.now()}.txt`;
            await FileSystem.writeAsStringAsync(tempUri, encryptedText, { encoding: FileSystem.EncodingType.UTF8 });
            
            fileToUpload = tempUri;
            fileName += '.e2ee.txt';
            contentType = 'text/plain';
        }

        const uploadUrl = `https://api.cloudinary.com/v1_1/do6lyfmn4/auto/upload`;

        const cloudData = await uploadWithProgressToCloudinary(
            fileToUpload,
            uploadUrl,
            'lrkgj8fj',
            onProgress || (() => {}),
            originalFileName || fileName,
            contentType
        );

        return {
            url: cloudData.secure_url,
            name: originalFileName || fileName,
            type: contentType,
            size: fileSize
        };
    } catch (error: any) {
        if (__DEV__) console.error('Error in uploadChatMessageMedia:', error);
        import('react-native').then(({ Alert }) => {
            Alert.alert('Upload Media Error', error?.message || JSON.stringify(error));
        });
        throw error;
    }
};

// XHR-based upload that gives real byte-level progress events for Cloudinary
export const uploadWithProgressToCloudinary = (
    uri: string,
    uploadUrl: string,
    uploadPreset: string,
    onProgress: (percent: number) => void,
    fileName: string,
    mimeType: string
): Promise<any> => {
    return new Promise((resolve, reject) => {
        try {
            const formData = new FormData();
            formData.append('file', { uri, type: mimeType || 'application/octet-stream', name: fileName } as any);
            formData.append('upload_preset', uploadPreset);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', uploadUrl);

            let lastProgressTime = 0;
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    const now = Date.now();
                    // Throttle updates to max 1 per 200ms to prevent UI freezing, unless it's 100%
                    if (now - lastProgressTime > 200 || percent === 100) {
                        onProgress(percent);
                        lastProgressTime = now;
                    }
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200 || xhr.status === 201) {
                    onProgress(100);
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(new Error(`XHR upload failed: ${xhr.responseText}`));
                }
            };

            xhr.onerror = () => reject(new Error('XHR upload network error'));
            xhr.send(formData);
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
    encryptWithNewKey: boolean = false
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

    let uploadUrl = `https://api.cloudinary.com/v1_1/do6lyfmn4/auto/upload`;
    const uploadPreset = 'lrkgj8fj';

    const fileInfo = await FileSystem.getInfoAsync(uri);
    const fileSize = fileInfo.exists ? (fileInfo as any).size : 0;

    let fileToUpload = uri;
    let mediaKey: Uint8Array | null = null;
    const originalContentType = contentType;

    if (encryptWithNewKey) {
        mediaKey = Crypto.getRandomBytes(32);
        
        // 🚨 YIELD THREAD 🚨: Allow React Native to render the UI (pending message) before heavy synchronous crypto
        await new Promise(resolve => setTimeout(resolve, 100));

        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        const encryptedText = await encryptFileBase64(base64, mediaKey);
        
        const tempUri = `${FileSystem.cacheDirectory}enc_${Crypto.randomUUID()}.bin`;
        await FileSystem.writeAsStringAsync(tempUri, encryptedText, { encoding: FileSystem.EncodingType.UTF8 });
        
        fileToUpload = tempUri;
        fileName = `${Crypto.randomUUID()}.txt`; // .txt so Cloudinary accepts it as raw text
        contentType = 'text/plain';
        uploadUrl = `https://api.cloudinary.com/v1_1/do6lyfmn4/raw/upload`; // use raw upload for encrypted text
    }

    // XHR gives real byte-level progress
    const cloudData = await uploadWithProgressToCloudinary(
        fileToUpload, 
        uploadUrl, 
        uploadPreset, 
        onProgress, 
        originalFileName || fileName, 
        contentType
    );

    return {
        url: cloudData.secure_url,
        name: originalFileName || fileName,
        type: originalContentType,
        size: fileSize,
        mediaKey: mediaKey ? Buffer.from(mediaKey).toString('base64') : null
    };
};

export const uploadGroupAvatar = async (uri: string) => {
    try {
        const fileName = `group_avatar_${Date.now()}.jpg`;

        const formData = new FormData();
        formData.append('file', { uri, type: 'image/jpeg', name: fileName } as any);
        formData.append('upload_preset', 'lrkgj8fj');

        const uploadUrl = `https://api.cloudinary.com/v1_1/do6lyfmn4/image/upload`;
        
        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData
        });

        const cloudData = await response.json();

        if (cloudData.error) {
            throw new Error(cloudData.error.message);
        }

        return { url: cloudData.secure_url };
    } catch (error) {
        if (__DEV__) console.error('Error in uploadGroupAvatar:', error);
        throw error;
    }
};
