import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useDbStore } from '@/store/useDbStore';
import { saveLocalCallLog } from '@/lib/localDb';

// Module-level map to safely track logs across multiple users and sessions
const sessionLogState = new Map<string, boolean>();

export const useCallLogger = (currentUser: any, friend: any, callType: string, callState: string | null) => {
    const stateRef = useRef(callState);
    const typeRef = useRef(callType);
    const userRef = useRef(currentUser);
    const friendRef = useRef(friend);

    // Track when this specific call session started
    const sessionTypeRef = useRef<string | null>(null);
    const sessionIdRef = useRef<string>('');

    useEffect(() => {
        stateRef.current = callState;
        typeRef.current = callType;
        userRef.current = currentUser;
        friendRef.current = friend;

        // Detect call start and lock the session type (incoming vs outgoing)
        if (callState === 'outgoing' || callState === 'incoming') {
            const newSessionId = `${currentUser?.id}_${friend?.id}_${callState}`;
            if (sessionIdRef.current !== newSessionId) {
                if (__DEV__) console.log(`[CALL_ACTION] NEW SESSION: ${newSessionId}. Resetting log locks.`);
                sessionIdRef.current = newSessionId;
                sessionTypeRef.current = callState;
                if (!sessionLogState.has(newSessionId)) {
                    sessionLogState.set(newSessionId, false);
                }
            }
        }
    }, [callState, friend?.id, currentUser?.id]);

    const saveCallLog = useCallback(async (status = 'completed', duration = 0, overrideFriend?: any) => {
        const friendData = overrideFriend || friendRef.current;
        const userData = userRef.current;
        const currentType = typeRef.current;

        if (!userData?.id || !friendData?.id) return;

        const currentSessionId = sessionIdRef.current;

        // 1. GLOBAL LOCK: If already logged for this exact session, STOP.
        if (sessionLogState.get(currentSessionId)) {
            if (__DEV__) console.log('[CALL_ACTION] Duplicate log prevented by Global Session Lock.');
            return;
        }

        // 2. Determine exact roles (Fixing Receiver Missed Call Bug)
        const isOutgoing = sessionTypeRef.current === 'outgoing';
        const actualCallerId = isOutgoing ? userData.id : friendData.id;
        const actualReceiverId = isOutgoing ? friendData.id : userData.id;

        sessionLogState.set(currentSessionId, true);
        if (__DEV__) console.log(`[CALL_ACTION] EXECUTING LOG SAVE: Status=${status}, Duration=${duration}`);

        try {
            // Save to call_logs (created_at is handled automatically by Postgres server-side)
            const { data: logData, error: logError } = await supabase.from('call_logs').insert([{
                caller_id: actualCallerId,
                receiver_id: actualReceiverId,
                call_type: currentType,
                status: status,
                duration: duration
            }]).select();

            if (logError) throw logError;

            const logId = logData && logData[0] ? logData[0].id : null;

            // 3. Save to Local DB
            const { db } = useDbStore.getState();
            if (db && logId) {
                await saveLocalCallLog(db, {
                    id: logId,
                    user_id: userData.id,
                    friend_id: friendData.id,
                    type: currentType,
                    status: status,
                    duration: duration,
                    created_at: new Date().toISOString()
                });
            }

            // Save to messages (this is what shows in the chat box)
            const { error: msgError } = await supabase.from('messages').insert([{
                sender_id: actualCallerId,
                receiver_id: actualReceiverId,
                message: `Call ${status}`,
                message_type: 'call',
                status: 'sent',
                is_read: false,
                call_details: {
                    call_id: logId,
                    duration: duration,
                    call_type: currentType,
                    status: status
                }
            }]);

            if (msgError) throw msgError;

            if (__DEV__) console.log('[CALL_ACTION] Log saved successfully.');
        } catch (error) {
            if (__DEV__) console.error('[CALL_ACTION] Log save failed:', error);
            sessionLogState.set(currentSessionId, false); // Allow one retry if it failed
        }
    }, []);

    return { saveCallLog };
};
