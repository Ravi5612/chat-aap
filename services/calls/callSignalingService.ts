import { supabase } from '@/lib/supabase';

// Helper function for reliable signaling without race conditions
export const sendSignalReliably = (targetId: string, payload: any) => {
    const channelName = `calls-signal-${targetId}`;
    const channel = supabase.channel(channelName);
    let timeoutId: NodeJS.Timeout;

    const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        supabase.removeChannel(channel).catch(() => {});
    };

    channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            try {
                await channel.send({
                    type: 'broadcast',
                    event: 'signal',
                    payload
                });
            } catch (e) {
                if (__DEV__) console.warn('[CALL_ACTION] Failed to send signal:', e);
            }
            cleanup(); // Clean up immediately after sending
        }
    });

    // Fail-safe cleanup after 8 seconds
    timeoutId = setTimeout(cleanup, 8000);
};

export const sendCallPushNotification = async (recipientId: string, callerName: string, channelName: string) => {
    try {
        await supabase.functions.invoke('call-signal', {
            body: { 
                recipient_id: recipientId, 
                caller_name: callerName, 
                channel_name: channelName
            }
        });
    } catch (e: any) {
        if (__DEV__) console.error("Push Error:", e.message);
    }
};
