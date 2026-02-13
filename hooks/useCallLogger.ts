import { useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { encryptText, getChatKey } from '@/utils/chatCrypto';

export const useCallLogger = (currentUser: any, friend: any, callType: string, callState: string) => {
    const saveCallLog = async (status = 'completed', duration = 0) => {
        if (!currentUser || !friend) return;

        // Caller handles the primary log to avoid duplicates
        if (callState === 'outgoing' || callState === 'active') {
            try {
                // 1. Database log
                await supabase.from('call_logs').insert([{
                    caller_id: currentUser.id,
                    receiver_id: friend.id,
                    call_type: callType,
                    status: status,
                    duration: duration
                }]);

                // 2. Chat Message Log
                const chatKey = await getChatKey(currentUser.id, friend.id);

                let logMessage = '';
                if (status === 'missed' || status === 'unavailable' || (status === 'completed' && duration === 0)) {
                    logMessage = `Missed ${callType} call`;
                } else {
                    const mins = Math.floor(duration / 60);
                    const secs = duration % 60;
                    const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                    logMessage = `${callType.charAt(0).toUpperCase() + callType.slice(1)} call ended • ${durationStr}`;
                }

                const encryptedLog = await encryptText(logMessage, chatKey);

                await supabase.from('messages').insert([{
                    sender_id: currentUser.id,
                    receiver_id: friend.id,
                    message: encryptedLog,
                    message_type: 'call',
                    call_details: { type: callType, status, duration },
                    status: 'sent',
                    is_read: false
                }]);
            } catch (err) {
                console.error("Failed to save call log:", err);
            }
        }
    };

    return { saveCallLog };
};
