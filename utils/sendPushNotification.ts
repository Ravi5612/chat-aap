import { supabase } from '@/lib/supabase';

export const sendPushNotificationToUser = async (
    receiverId: string, 
    senderId: string, 
    senderName: string, 
    senderImage: string | null, 
    type: 'message' | 'call', 
    messageId?: string
) => {
    try {
        // Fetch receiver's push token
        const { data: profile } = await supabase
            .from('profiles')
            .select('push_token')
            .eq('id', receiverId)
            .single();

        if (!profile?.push_token) {
            console.log('[PUSH] No push token found for user:', receiverId);
            return;
        }

        console.log(`[PUSH] Sending ${type} notification to ${profile.push_token}`);

        // Send to Expo Push API
        const message = {
            to: profile.push_token,
            sound: 'default',
            title: senderName,
            body: type === 'message' ? 'New Message' : 'Incoming Call...',
            data: { 
                senderId, 
                type, 
                name: senderName, 
                image: senderImage 
            },
            priority: 'high',
            channelId: 'default',
        };

        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        // Mark message as delivered
        if (type === 'message' && messageId) {
            const { error } = await supabase
                .from('messages')
                .update({ status: 'delivered' })
                .eq('id', messageId)
                .eq('status', 'sent');
                
            if (error) {
                console.error('[PUSH] Error updating message status:', error);
            } else {
                console.log(`[PUSH] Marked message ${messageId} as delivered.`);
            }
        }
    } catch (error) {
        console.error('[PUSH] Error sending push notification:', error);
    }
};
