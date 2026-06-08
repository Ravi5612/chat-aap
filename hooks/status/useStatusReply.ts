import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';

export const useStatusReply = (
    currentUser: any,
    userId: string,
    currentStatusUI: any,
    showToast: (msg: string) => void
) => {
    const [replyText, setReplyText] = useState('');

    const handleSendReply = async () => {
        if (!replyText.trim() || !currentUser || !currentStatusUI) return;
        try {
            const { getChatKey, encryptText } = await import('@/utils/chatCrypto');
            const chatKey = await getChatKey(currentUser.id, userId as string);
            if (!chatKey) throw new Error("Encryption key not found");

            const encryptedReply = await encryptText(replyText.trim(), chatKey);
            const { useDbStore } = await import('@/store/useDbStore');
            const { saveLocalMessage } = await import('@/lib/localDb');
            const { db } = useDbStore.getState();
            
            const tempId = `temp-${Date.now()}`;
            const tempMsg: any = {
                id: tempId, sender_id: currentUser.id, receiver_id: userId,
                message: replyText.trim(), message_type: 'text', status: 'pending',
                is_read: false, status_id: currentStatusUI.id, created_at: new Date().toISOString()
            };

            if (db) saveLocalMessage(db, tempMsg);

            const { data, error } = await supabase.from('messages').insert([{
                sender_id: currentUser.id, receiver_id: userId, message: encryptedReply,
                message_type: 'text', status: 'sent', is_read: false, status_id: currentStatusUI.id
            }]).select().single();

            if (error) throw error;

            if (db && data) {
                try { await db.runAsync('DELETE FROM messages WHERE id = ?', [tempId]); } catch (e) {}
                saveLocalMessage(db, { ...data, message: replyText.trim() });
            }

            setReplyText('');
            showToast('Your reply has been sent! 🚀');
        } catch (error: any) {
            console.error('Error sending status reply:', error);
            Alert.alert('Error', 'Failed to send encrypted reply');
        }
    };

    return {
        replyText,
        setReplyText,
        handleSendReply
    };
};
