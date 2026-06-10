import { useState, useEffect } from 'react';
import { decryptText, getChatKey, decryptKeyWithSharedSecret } from '@/utils/chatCrypto';
import { useAuthStore } from '@/store/useAuthStore';

export function useStatusContext(statusContext: any) {
    const [decryptedStatusContent, setDecryptedStatusContent] = useState<string | null>(null);
    const [decryptedStatusMedia, setDecryptedStatusMedia] = useState<string | null>(null);

    useEffect(() => {
        const decryptStatusContext = async () => {
            if (!statusContext) return;
            try {
                const currentUser = useAuthStore.getState().user;
                let statusKey = null;

                // 1. Try Hybrid E2EE Key Extraction
                if (statusContext.encrypted_keys && currentUser?.id) {
                    const encryptedMasterKey = statusContext.encrypted_keys[currentUser.id];
                    if (encryptedMasterKey) {
                        // We need the uploader's public_key to derive the shared secret
                        const { supabase } = await import('@/lib/supabase');
                        const { data: profile } = await supabase.from('profiles').select('public_key').eq('id', statusContext.user_id).single();
                        if (profile?.public_key) {
                            statusKey = await decryptKeyWithSharedSecret(encryptedMasterKey, profile.public_key, currentUser.id);
                        }
                    }
                }

                // 2. Fallback for legacy statuses
                if (!statusKey) {
                    statusKey = await getChatKey(statusContext.user_id, statusContext.user_id);
                }

                let content = statusContext.content || '';
                let mediaUrl = statusContext.media_url || '';

                if (content && content.trim().startsWith('{')) {
                    if (statusKey) {
                        try { content = await decryptText(content, statusKey); } catch (e) { content = '🔒 Status'; }
                        if (mediaUrl) {
                            try { mediaUrl = await decryptText(mediaUrl, statusKey); } catch (e) { mediaUrl = ''; }
                        }
                    } else {
                        content = '🔒 Status';
                        mediaUrl = '';
                    }
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
