import { useEffect } from 'react';
import { displayOutgoingCall, cancelOutgoingCall, cancelIncomingCall } from '@/utils/notifeeCalling';

export const useCallNotifications = (callSession: any) => {
    useEffect(() => {
        if (!callSession) {
            cancelOutgoingCall();
            cancelIncomingCall();
            return;
        }

        // If it's an outgoing call that was initiated by us
        if (['outgoing', 'ringing', 'active'].includes(callSession.status) && callSession.type !== 'incoming') {
            let statusText = 'Calling...';
            if (callSession.status === 'ringing') statusText = 'Ringing...';
            if (callSession.status === 'active') statusText = 'Active (0:00)';
            
            displayOutgoingCall(callSession.friend?.name || 'Someone', statusText, callSession.friend?.avatar_url);

            let interval: NodeJS.Timeout;
            if (callSession.status === 'active') {
                let seconds = 0;
                interval = setInterval(() => {
                    seconds++;
                    const m = Math.floor(seconds / 60);
                    const s = seconds % 60;
                    const timeStr = `${m}:${s.toString().padStart(2, '0')}`;
                    displayOutgoingCall(callSession.friend?.name || 'Someone', `Active (${timeStr})`, callSession.friend?.avatar_url);
                }, 1000);
            }

            return () => {
                if (interval) clearInterval(interval);
            };
        } else {
            // Cancel outgoing notification if it's incoming or ended
            cancelOutgoingCall();
        }
        
        // Ensure incoming call notification is cancelled when active or ended
        if (callSession.status === 'active' || callSession.status === 'ended') {
            cancelIncomingCall();
        }
    }, [callSession?.status, callSession?.friend?.name, callSession?.friend?.avatar_url, callSession?.type]);
};
