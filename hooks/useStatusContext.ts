import { useState, useEffect } from 'react';
import { decryptText, getChatKey } from '@/utils/chatCrypto';

export function useStatusContext(statusContext: any) {
    const [decryptedStatusContent, setDecryptedStatusContent] = useState<string | null>(null);
    const [decryptedStatusMedia, setDecryptedStatusMedia] = useState<string | null>(null);

    useEffect(() => {
        const decryptStatusContext = async () => {
            if (!statusContext) return;
            try {
                const statusKey = await getChatKey(statusContext.user_id, statusContext.user_id);

                let content = statusContext.content || '';
                let mediaUrl = statusContext.media_url || '';

                if (content && content.trim().startsWith('{')) {
                    try { content = await decryptText(content, statusKey); } catch (e) { content = '🔒 Status'; }
                }
                if (mediaUrl && mediaUrl.trim().startsWith('{')) {
                    try { mediaUrl = await decryptText(mediaUrl, statusKey); } catch (e) { mediaUrl = ''; }
                }

                setDecryptedStatusContent(content);
                setDecryptedStatusMedia(mediaUrl);
            } catch (e) {
                setDecryptedStatusContent(statusContext?.content?.startsWith('{') ? '🔒 Status' : statusContext?.content);
                setDecryptedStatusMedia(statusContext?.media_url?.startsWith('{') ? '' : statusContext?.media_url);
            }
        };

        decryptStatusContext();
    }, [statusContext]);

    return { decryptedStatusContent, decryptedStatusMedia };
}
