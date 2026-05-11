import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useDbStore } from '@/store/useDbStore';
import { saveLocalCallLog } from '@/lib/localDb';

// Global variable to persist across hook re-renders for the same session
let globalLastSessionId = '';
let globalHasLogged = false;

export const useCallLogger = (currentUser: any, friend: any, callType: string, callState: string | null) => {
    const stateRef = useRef(callState);
    const typeRef = useRef(callType);
    const userRef = useRef(currentUser);
    const friendRef = useRef(friend);

    // Track when this specific call session started
    const sessionTypeRef = useRef<string | null>(null);

    useEffect(() => {
        stateRef.current = callState;
        typeRef.current = callType;
        userRef.current = currentUser;
        friendRef.current = friend;

        // Detect call start and lock the session type (incoming vs outgoing)
        if (callState === 'outgoing' || callState === 'incoming') {
            const sessionId = `${friend?.id}_${callState}`;
            if (globalLastSessionId !== sessionId) {
                console.log(`[CALL_ACTION] NEW SESSION: ${sessionId}. Resetting log locks.`);
                globalLastSessionId = sessionId;
                globalHasLogged = false;
                sessionTypeRef.current = callState;
            }
        }
    }, [callState, friend?.id]);

    const saveCallLog = useCallback(async (status = 'completed', duration = 0, overrideFriend?: any) => {
        const friendData = overrideFriend || friendRef.current;
        const userData = userRef.current;
        const currentType = typeRef.current;

        if (!userData?.id || !friendData?.id) return;

        // 1. GLOBAL LOCK: If already logged for this session, STOP.
        if (globalHasLogged) {
            console.log('[CALL_ACTION] Duplicate log prevented by Global Lock.');
            return;
        }

        // 2. CALLER ONLY: Only the one who started the call logs it.
        if (sessionTypeRef.current !== 'outgoing') {
            console.log('[CALL_ACTION] Receiver side - skipping log to prevent duplicates.');
            globalHasLogged = true; // Still lock it locally
            return;
        }

        globalHasLogged = true;
        console.log(`[CALL_ACTION] EXECUTING LOG SAVE: Status=${status}, Duration=${duration}`);

        try {
            // We OMIT the 'id' field so Supabase/Postgres generates a valid UUID automatically
            
            // Save to call_logs
            const { data: logData, error: logError } = await supabase.from('call_logs').insert([{
                caller_id: userData.id,
                receiver_id: friendData.id,
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
                sender_id: userData.id,
                receiver_id: friendData.id,
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

            console.log('[CALL_ACTION] Log saved successfully.');
        } catch (error) {
            console.error('[CALL_ACTION] Log save failed:', error);
            globalHasLogged = false; // Allow one retry if it failed
        }
    }, []);

    return { saveCallLog };
};
