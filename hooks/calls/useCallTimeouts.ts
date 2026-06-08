import { useEffect } from 'react';

export const useCallTimeouts = (
    callSession: any, 
    logCallHistory: Function, 
    setCallEnded: Function
) => {
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        if (callSession?.status === 'outgoing') {
            // Wait 30 seconds for 'ringing' signal. If not received, they are offline.
            timeoutId = setTimeout(() => {
                if (__DEV__) console.log('[DEBUG] CallManager: Outgoing call timed out (User unreachable)');
                logCallHistory('cancelled');
                setCallEnded('User is offline or unreachable');
            }, 30000);
        } else if (callSession?.status === 'ringing') {
            // Wait 60 seconds for them to answer. If not, it's a missed call.
            timeoutId = setTimeout(() => {
                if (__DEV__) console.log('[DEBUG] CallManager: Ringing call timed out (No answer)');
                logCallHistory('missed');
                setCallEnded('Call unanswered');
            }, 60000);
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [callSession?.status, logCallHistory, setCallEnded]);
};
