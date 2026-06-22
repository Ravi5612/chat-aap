import { useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import { getMediaCache, saveMediaCache } from '@/lib/localDb';
import { useDbStore } from '@/store/useDbStore';
import { useChatStore } from '@/store/useChatStore';
import { decryptFileBase64 } from '@/utils/uploadHelper';
import { Buffer } from 'buffer';

export function useMessageMediaCache(message: any, imageUrl: string | null, voiceUri: string | null, documentUrl: string | null = null, customKey?: Uint8Array | null, videoUrl: string | null = null) {
    const isLocalImageInitial = imageUrl?.startsWith('file://') || imageUrl?.startsWith('content://') || imageUrl?.startsWith('file:/') || imageUrl?.startsWith('data:image/');
    
    const [localImageUrl, setLocalImageUrl] = useState<string | null>(isLocalImageInitial ? imageUrl : null);
    const [localVoiceUrl, setLocalVoiceUrl] = useState<string | null>(null);
    const [localDocumentUrl, setLocalDocumentUrl] = useState<string | null>(null);
    const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
    const [mediaLoading, setMediaLoading] = useState(!isLocalImageInitial && !!(imageUrl || videoUrl || voiceUri || documentUrl));

    useEffect(() => {
        let isMounted = true;
        const handleMediaCache = async () => {
            const { db } = useDbStore.getState();
            if (!db) return;

            const parseMediaUrl = (url: string | null) => {
                if (url && url.startsWith('{')) {
                    try {
                        const payload = JSON.parse(url);
                        if (payload.url && payload.mediaKey) {
                            return { actualUrl: payload.url, mediaKey: new Uint8Array(Buffer.from(payload.mediaKey, 'base64')) };
                        }
                    } catch (e) {}
                }
                return { actualUrl: url, mediaKey: null };
            };

            const { actualUrl: parsedImageUrl, mediaKey: imageMediaKey } = parseMediaUrl(imageUrl);
            const { actualUrl: parsedVoiceUrl, mediaKey: voiceMediaKey } = parseMediaUrl(voiceUri);
            const { actualUrl: parsedDocumentUrl, mediaKey: documentMediaKey } = parseMediaUrl(documentUrl);
            const { actualUrl: parsedVideoUrl, mediaKey: videoMediaKey } = parseMediaUrl(videoUrl);

            const isLocalImage = parsedImageUrl?.startsWith('file://') || parsedImageUrl?.startsWith('content://') || parsedImageUrl?.startsWith('file:/') || parsedImageUrl?.startsWith('data:image/');
            if (parsedImageUrl && !isLocalImage) {
                const cached = await getMediaCache(db, parsedImageUrl);
                let cacheExists = false;
                if (cached) {
                    const info = await FileSystem.getInfoAsync(cached);
                    cacheExists = info.exists;
                }
                if (cacheExists) {
                    if (isMounted) {
                        setLocalImageUrl(cached);
                        setMediaLoading(false);
                    }
                } else {
                    try {
                        let filename = (typeof parsedImageUrl === 'string' ? parsedImageUrl.split('/').pop() : null) || 'media.jpg';
                        // Remove query parameters from filename
                        filename = filename.split('?')[0];
                        const isE2EE = !!imageMediaKey || parsedImageUrl.includes('.txt');
                        let ext = message?.media_type === 'video' ? '.mp4' : '.jpg';
                        const localFileName = isE2EE ? filename.replace('.e2ee.txt', ext).replace('.txt', ext).replace('.bin', ext) : filename;
                        const localUri = `${FileSystem.cacheDirectory}${localFileName}`;
                        
                        if (isE2EE) {
                            const decryptKey = imageMediaKey || customKey || useChatStore.getState().chatKey;
                            if (decryptKey) {
                                const response = await fetch(parsedImageUrl);
                                const encryptedText = await response.text();
                                const base64 = await decryptFileBase64(encryptedText, decryptKey);
                                await FileSystem.writeAsStringAsync(localUri, base64, { encoding: FileSystem.EncodingType.Base64 });
                                await saveMediaCache(db, parsedImageUrl, localUri, 'image');
                                if (isMounted) setLocalImageUrl(localUri);
                            }
                        } else {
                            const download = await FileSystem.downloadAsync(parsedImageUrl, localUri);
                            if (download.status === 200) {
                                await saveMediaCache(db, parsedImageUrl, download.uri, 'image');
                                if (isMounted) setLocalImageUrl(download.uri);
                            }
                        }
                    } catch (e) {
                        console.error('[CACHE] Image processing failed:', e);
                    } finally {
                        if (isMounted) setMediaLoading(false);
                    }
                }
            } else if (isLocalImage) {
                if (isMounted) setMediaLoading(false);
            }

            if (parsedVoiceUrl && !parsedVoiceUrl.startsWith('file://')) {
                const cached = await getMediaCache(db, parsedVoiceUrl);
                let cacheExists = false;
                if (cached) {
                    const info = await FileSystem.getInfoAsync(cached);
                    cacheExists = info.exists;
                }
                if (cacheExists) {
                    if (isMounted) setLocalVoiceUrl(cached);
                } else {
                    try {
                        const filename = (typeof parsedVoiceUrl === 'string' ? parsedVoiceUrl.split('/').pop() : null) || 'voice.m4a';
                        const isE2EE = !!voiceMediaKey || parsedVoiceUrl.includes('.txt');
                        const localFileName = isE2EE ? filename.replace('.e2ee.txt', '.m4a').replace('.txt', '.m4a').replace('.bin', '.m4a') : filename;
                        const localUri = `${FileSystem.cacheDirectory}${localFileName}`;

                        if (isE2EE) {
                            const decryptKey = voiceMediaKey || customKey || useChatStore.getState().chatKey;
                            if (decryptKey) {
                                const response = await fetch(parsedVoiceUrl);
                                const encryptedText = await response.text();
                                const base64 = await decryptFileBase64(encryptedText, decryptKey);
                                await FileSystem.writeAsStringAsync(localUri, base64, { encoding: FileSystem.EncodingType.Base64 });
                                await saveMediaCache(db, parsedVoiceUrl, localUri, 'audio');
                                if (isMounted) setLocalVoiceUrl(localUri);
                            }
                        } else {
                            const download = await FileSystem.downloadAsync(parsedVoiceUrl, localUri);
                            if (download.status === 200) {
                                await saveMediaCache(db, parsedVoiceUrl, download.uri, 'audio');
                                if (isMounted) setLocalVoiceUrl(download.uri);
                            }
                        }
                    } catch (e) {
                        console.error('[CACHE] Voice processing failed:', e);
                    }
                }
            }

            if (parsedDocumentUrl && !parsedDocumentUrl.startsWith('file://')) {
                const cached = await getMediaCache(db, parsedDocumentUrl);
                let cacheExists = false;
                if (cached) {
                    const info = await FileSystem.getInfoAsync(cached);
                    cacheExists = info.exists;
                }
                if (cacheExists) {
                    if (isMounted) setLocalDocumentUrl(cached);
                } else {
                    try {
                        const filename = (typeof parsedDocumentUrl === 'string' ? parsedDocumentUrl.split('/').pop() : null) || 'doc.bin';
                        const isE2EE = !!documentMediaKey || parsedDocumentUrl.includes('.txt');
                        let ext = 'bin';
                        if (message?.file_name) {
                            const parts = message.file_name.split('.');
                            if (parts.length > 1) ext = parts[parts.length - 1];
                        }
                        const localFileName = isE2EE ? filename.replace('.e2ee.txt', `.${ext}`).replace('.txt', `.${ext}`).replace('.bin', `.${ext}`) : filename;
                        const localUri = `${FileSystem.cacheDirectory}${localFileName}`;

                        if (isE2EE) {
                            const decryptKey = documentMediaKey || customKey || useChatStore.getState().chatKey;
                            if (decryptKey) {
                                const response = await fetch(parsedDocumentUrl);
                                const encryptedText = await response.text();
                                const base64 = await decryptFileBase64(encryptedText, decryptKey);
                                await FileSystem.writeAsStringAsync(localUri, base64, { encoding: FileSystem.EncodingType.Base64 });
                                await saveMediaCache(db, parsedDocumentUrl, localUri, 'document');
                                if (isMounted) setLocalDocumentUrl(localUri);
                            }
                        } else {
                            const download = await FileSystem.downloadAsync(parsedDocumentUrl, localUri);
                            if (download.status === 200) {
                                await saveMediaCache(db, parsedDocumentUrl, download.uri, 'document');
                                if (isMounted) setLocalDocumentUrl(download.uri);
                            }
                        }
                    } catch (e) {
                        console.error('[CACHE] Document processing failed:', e);
                    }
                }
            }

            if (parsedVideoUrl && !parsedVideoUrl.startsWith('file://')) {
                const cached = await getMediaCache(db, parsedVideoUrl);
                let cacheExists = false;
                if (cached) {
                    const info = await FileSystem.getInfoAsync(cached);
                    cacheExists = info.exists;
                }
                if (cacheExists) {
                    if (isMounted) setLocalVideoUrl(cached);
                } else {
                    try {
                        let filename = (typeof parsedVideoUrl === 'string' ? parsedVideoUrl.split('/').pop() : null) || 'video.mp4';
                        // Remove query parameters from filename
                        filename = filename.split('?')[0];
                        const isE2EE = !!videoMediaKey || parsedVideoUrl.includes('.txt');
                        const localFileName = isE2EE ? filename.replace('.e2ee.txt', '.mp4').replace('.txt', '.mp4').replace('.bin', '.mp4') : filename;
                        const localUri = `${FileSystem.cacheDirectory}${localFileName}`;

                        if (isE2EE) {
                            const decryptKey = videoMediaKey || customKey || useChatStore.getState().chatKey;
                            if (decryptKey) {
                                const response = await fetch(parsedVideoUrl);
                                const encryptedText = await response.text();
                                const base64 = await decryptFileBase64(encryptedText, decryptKey);
                                await FileSystem.writeAsStringAsync(localUri, base64, { encoding: FileSystem.EncodingType.Base64 });
                                await saveMediaCache(db, parsedVideoUrl, localUri, 'video');
                                if (isMounted) setLocalVideoUrl(localUri);
                            }
                        } else {
                            const download = await FileSystem.downloadAsync(parsedVideoUrl, localUri);
                            if (download.status === 200) {
                                await saveMediaCache(db, parsedVideoUrl, download.uri, 'video');
                                if (isMounted) setLocalVideoUrl(download.uri);
                            }
                        }
                    } catch (e) {
                        console.error('[CACHE] Video processing failed:', e);
                    }
                }
            }
        };

        handleMediaCache();

        return () => {
            isMounted = false;
        };
    }, [imageUrl, voiceUri, documentUrl, videoUrl, message?.file_name, customKey]);

    return { localImageUrl, localVoiceUrl, localDocumentUrl, localVideoUrl, imageLoading: mediaLoading, setImageLoading: setMediaLoading };
}
