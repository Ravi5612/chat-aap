import { useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import { getMediaCache, saveMediaCache } from '@/lib/localDb';
import { useDbStore } from '@/store/useDbStore';
import { useChatStore } from '@/store/useChatStore';
import { decryptFileBase64 } from '@/utils/uploadHelper';

export function useMessageMediaCache(message: any, imageUrl: string | null, voiceUri: string | null, documentUrl: string | null = null, customKey?: Uint8Array | null) {
    const isLocalImageInitial = imageUrl?.startsWith('file://') || imageUrl?.startsWith('content://') || imageUrl?.startsWith('file:/') || imageUrl?.startsWith('data:image/');
    
    const [localImageUrl, setLocalImageUrl] = useState<string | null>(isLocalImageInitial ? imageUrl : null);
    const [localVoiceUrl, setLocalVoiceUrl] = useState<string | null>(null);
    const [localDocumentUrl, setLocalDocumentUrl] = useState<string | null>(null);
    const [imageLoading, setImageLoading] = useState(!isLocalImageInitial && !!imageUrl);

    useEffect(() => {
        let isMounted = true;
        const handleMediaCache = async () => {
            const { db } = useDbStore.getState();
            if (!db) return;

            const isLocalImage = imageUrl?.startsWith('file://') || imageUrl?.startsWith('content://') || imageUrl?.startsWith('file:/') || imageUrl?.startsWith('data:image/');
            if (imageUrl && !isLocalImage) {
                const cached = await getMediaCache(db, imageUrl);
                if (cached) {
                    if (isMounted) {
                        setLocalImageUrl(cached);
                        setImageLoading(false);
                    }
                } else {
                    try {
                        const filename = (typeof imageUrl === 'string' ? imageUrl.split('/').pop() : null) || 'media.jpg';
                        const isE2EE = imageUrl.endsWith('.e2ee.txt');
                        const localFileName = isE2EE ? filename.replace('.txt', '.jpg') : filename;
                        const localUri = `${FileSystem.cacheDirectory}${localFileName}`;
                        
                        if (isE2EE) {
                            const chatKey = customKey || useChatStore.getState().chatKey;
                            if (chatKey) {
                                const response = await fetch(imageUrl);
                                const encryptedText = await response.text();
                                const base64 = await decryptFileBase64(encryptedText, chatKey);
                                await FileSystem.writeAsStringAsync(localUri, base64, { encoding: FileSystem.EncodingType.Base64 });
                                await saveMediaCache(db, imageUrl, localUri, 'image');
                                if (isMounted) setLocalImageUrl(localUri);
                            }
                        } else {
                            const download = await FileSystem.downloadAsync(imageUrl, localUri);
                            if (download.status === 200) {
                                await saveMediaCache(db, imageUrl, download.uri, 'image');
                                if (isMounted) setLocalImageUrl(download.uri);
                            }
                        }
                    } catch (e) {
                        console.error('[CACHE] Image processing failed:', e);
                    } finally {
                        if (isMounted) setImageLoading(false);
                    }
                }
            } else if (isLocalImage) {
                if (isMounted) setImageLoading(false);
            }

            if (voiceUri && !voiceUri.startsWith('file://')) {
                const cached = await getMediaCache(db, voiceUri);
                if (cached) {
                    if (isMounted) setLocalVoiceUrl(cached);
                } else {
                    try {
                        const filename = (typeof voiceUri === 'string' ? voiceUri.split('/').pop() : null) || 'voice.m4a';
                        const isE2EE = voiceUri.endsWith('.e2ee.txt');
                        const localFileName = isE2EE ? filename.replace('.txt', '.m4a') : filename;
                        const localUri = `${FileSystem.cacheDirectory}${localFileName}`;

                        if (isE2EE) {
                            const chatKey = customKey || useChatStore.getState().chatKey;
                            if (chatKey) {
                                const response = await fetch(voiceUri);
                                const encryptedText = await response.text();
                                const base64 = await decryptFileBase64(encryptedText, chatKey);
                                await FileSystem.writeAsStringAsync(localUri, base64, { encoding: FileSystem.EncodingType.Base64 });
                                await saveMediaCache(db, voiceUri, localUri, 'audio');
                                if (isMounted) setLocalVoiceUrl(localUri);
                            }
                        } else {
                            const download = await FileSystem.downloadAsync(voiceUri, localUri);
                            if (download.status === 200) {
                                await saveMediaCache(db, voiceUri, download.uri, 'audio');
                                if (isMounted) setLocalVoiceUrl(download.uri);
                            }
                        }
                    } catch (e) {
                        console.error('[CACHE] Voice processing failed:', e);
                    }
                }
            }

            if (documentUrl && !documentUrl.startsWith('file://')) {
                const cached = await getMediaCache(db, documentUrl);
                if (cached) {
                    if (isMounted) setLocalDocumentUrl(cached);
                } else {
                    try {
                        const filename = (typeof documentUrl === 'string' ? documentUrl.split('/').pop() : null) || 'doc.bin';
                        const isE2EE = documentUrl.endsWith('.e2ee.txt');
                        let ext = 'bin';
                        if (message?.file_name) {
                            const parts = message.file_name.split('.');
                            if (parts.length > 1) ext = parts[parts.length - 1];
                        }
                        const localFileName = isE2EE ? filename.replace('.txt', `.${ext}`) : filename;
                        const localUri = `${FileSystem.cacheDirectory}${localFileName}`;

                        if (isE2EE) {
                            const chatKey = customKey || useChatStore.getState().chatKey;
                            if (chatKey) {
                                const response = await fetch(documentUrl);
                                const encryptedText = await response.text();
                                const base64 = await decryptFileBase64(encryptedText, chatKey);
                                await FileSystem.writeAsStringAsync(localUri, base64, { encoding: FileSystem.EncodingType.Base64 });
                                await saveMediaCache(db, documentUrl, localUri, 'document');
                                if (isMounted) setLocalDocumentUrl(localUri);
                            }
                        } else {
                            const download = await FileSystem.downloadAsync(documentUrl, localUri);
                            if (download.status === 200) {
                                await saveMediaCache(db, documentUrl, download.uri, 'document');
                                if (isMounted) setLocalDocumentUrl(download.uri);
                            }
                        }
                    } catch (e) {
                        console.error('[CACHE] Document processing failed:', e);
                    }
                }
            }
        };

        handleMediaCache();

        return () => {
            isMounted = false;
        };
    }, [imageUrl, voiceUri, documentUrl, message?.file_name, customKey]);

    return { localImageUrl, localVoiceUrl, localDocumentUrl, imageLoading, setImageLoading };
}
