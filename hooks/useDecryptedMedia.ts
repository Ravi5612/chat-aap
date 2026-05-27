import { useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import { decryptFileBase64 } from '../utils/uploadHelper';

export const useDecryptedMedia = (
    url: string | null,
    chatKey: Uint8Array | null,
    type: 'image' | 'video' | 'audio' | 'document' = 'image'
) => {
    const [localUri, setLocalUri] = useState<string | null>(null);
    const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const processMedia = async () => {
            if (!url) {
                if (isMounted) setLocalUri(null);
                return;
            }

            // If it's a local file or not an e2ee url, use it directly
            if (url.startsWith('file://') || url.startsWith('content://') || !url.endsWith('.e2ee.txt')) {
                if (isMounted) setLocalUri(url);
                return;
            }

            if (!chatKey) {
                if (isMounted) setError("Missing decryption key");
                return;
            }

            try {
                if (isMounted) setIsDecrypting(true);

                // Create a deterministic cache path
                const filename = url.split('/').pop()?.replace('.txt', '') || `enc_${Date.now()}`;
                
                let ext = 'bin';
                if (type === 'image') ext = 'jpg';
                else if (type === 'video') ext = 'mp4';
                else if (type === 'audio') ext = 'm4a';

                const cacheUri = `${FileSystem.cacheDirectory}dec_${filename}.${ext}`;

                // Check if already decrypted and cached
                const fileInfo = await FileSystem.getInfoAsync(cacheUri);
                if (fileInfo.exists) {
                    if (isMounted) {
                        setLocalUri(cacheUri);
                        setIsDecrypting(false);
                    }
                    return;
                }

                // Download the encrypted text file
                const response = await fetch(url);
                const encryptedText = await response.text();

                // Decrypt the text back to Base64
                const base64 = await decryptFileBase64(encryptedText, chatKey);

                // Write the Base64 to a binary file
                await FileSystem.writeAsStringAsync(cacheUri, base64, { encoding: FileSystem.EncodingType.Base64 });

                if (isMounted) {
                    setLocalUri(cacheUri);
                    setIsDecrypting(false);
                }
            } catch (err: any) {
                console.error("Media decryption error:", err);
                if (isMounted) {
                    setError(err.message || "Decryption failed");
                    setIsDecrypting(false);
                    // Fallback to original url (might be broken if it's actually encrypted)
                    setLocalUri(url);
                }
            }
        };

        processMedia();

        return () => {
            isMounted = false;
        };
    }, [url, chatKey]);

    return { localUri, isDecrypting, error };
};
