import { useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { encryptText, getChatKey } from '@/utils/chatCrypto';

export const useCallLogger = (currentUser: any, friend: any, callType: string, callState: string) => {
    // Use refs to access latest state inside cleanup function (closure trap fix)
    const stateRef = useRef(callState);
    const typeRef = useRef(callType);
    const userRef = useRef(currentUser);
    const friendRef = useRef(friend);

    // Update refs on render
    stateRef.current = callState;
    typeRef.current = callType;
    userRef.current = currentUser;
    friendRef.current = friend;

    const saveCallLog = async (status = 'completed', duration = 0) => {
        const currentState = stateRef.current;
        const currentType = typeRef.current;
        const user = userRef.current;
        const friendData = friendRef.current;

        if (!user || !friendData) return;

        // Caller handles the primary log to avoid duplicates
        // Check potentially stale state ref
        if (currentState === 'outgoing' || currentState === 'active') {
            try {
                // 1. Database log
                await supabase.from('call_logs').insert([{
                    caller_id: user.id,
                    receiver_id: friendData.id,
                    call_type: currentType,
                    status: status,
                    duration: duration
                }]);

                // 2. Chat Message Log
                const chatKey = await getChatKey(user.id, friendData.id);

                let logMessage = '';
                if (status === 'missed' || status === 'unavailable' || (status === 'completed' && duration === 0)) {
                    logMessage = `Missed ${currentType} call`;
                } else {
                    const mins = Math.floor(duration / 60);
                    const secs = duration % 60;
                    const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                    logMessage = `${currentType.charAt(0).toUpperCase() + currentType.slice(1)} call ended • ${durationStr}`;
                }

                const encryptedLog = await encryptText(logMessage, chatKey);

                await supabase.from('messages').insert([{
                    sender_id: user.id,
                    receiver_id: friendData.id,
                    message: encryptedLog,
                    message_type: 'call',
                    call_details: { type: currentType, status, duration },
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
