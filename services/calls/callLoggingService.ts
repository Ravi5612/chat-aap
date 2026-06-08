import { supabase } from '@/lib/supabase';
import { useCallStore } from '@/store/useCallStore';
import { useChatStore } from '@/store/useChatStore';
import { useDbStore } from '@/store/useDbStore';
import { saveLocalCallLog } from '@/lib/localDb';

export const logCallHistory = (
    status: 'completed' | 'missed' | 'cancelled' | 'rejected', 
    sessionToLog: any,
    currentUser: any
) => {
    if (!sessionToLog || !currentUser?.id) return;
    
    // We only want the caller to dispatch the log to the DB to avoid duplicates.
    const isCaller = sessionToLog.type !== 'incoming';
    if (!isCaller) return;

    const friendId = sessionToLog.friend?.id;
    if (!friendId) return;

    const { activeStartTime } = useCallStore.getState();
    let duration = 0;
    if (status === 'completed' && activeStartTime) {
        duration = Math.floor((Date.now() - activeStartTime) / 1000);
    }

    const callLogPayload = {
        type: 'call_log',
        call_type: sessionToLog.type,
        status,
        duration,
        call_id: `call-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    };

    const jsonString = JSON.stringify(callLogPayload);
    
    if (__DEV__) console.log(`[CALL_ACTION] Logging Call: ${status} for ${duration}s to ${friendId}`);

    // Insert into native call_logs table for the Calls tab
    try {
        supabase.from('call_logs').insert([{
            caller_id: currentUser.id,
            receiver_id: friendId,
            type: sessionToLog.type, // Changed from call_type to type to match Supabase schema
            status: status,
            duration: duration
        }]).select().then(async ({ data, error }) => {
            if (error && __DEV__) console.error('[CALL_ACTION] Failed to insert into call_logs table:', error);
            
            // Save to Local DB if remote insert succeeded
            if (data && data[0]) {
                const logId = data[0].id;
                const { db } = useDbStore.getState();
                if (db) {
                    await saveLocalCallLog(db, {
                        id: logId,
                        caller_id: currentUser.id,
                        receiver_id: friendId,
                        call_type: sessionToLog.type,
                        status: status,
                        duration: duration,
                        created_at: new Date().toISOString()
                    });
                    if (__DEV__) console.log('[CALL_ACTION] Saved call log to local DB successfully');
                }
            }
        });
    } catch (e) {
        // fail silently
    }

    // Fire and forget encrypted message log
    useChatStore.getState().sendMessage(jsonString, friendId, currentUser, !!sessionToLog.isGroup, undefined, 'call_log');
};
