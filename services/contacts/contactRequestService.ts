import { supabase } from '@/lib/supabase';
import { DeviceEventEmitter } from 'react-native';

export const sendContactFriendRequest = async (currentUserId: string, receiverId: string, senderProfile: any) => {
    // Insert friend request
    const { error: requestError } = await supabase
        .from('friend_requests')
        .insert([{
            sender_id: currentUserId,
            receiver_id: receiverId,
            status: 'pending'
        }]);

    if (requestError) {
        if (requestError.code === '23503') { // Foreign key constraint violation
            throw new Error("This user no longer exists or their account was deleted.");
        }
        throw new Error(requestError.message);
    }

    // Send Notification (ignore errors here to not block the main flow)
    try {
        await supabase.from('notifications').insert([{
            user_id: receiverId,
            sender_id: currentUserId,
            type: 'friend_request',
            message: `${senderProfile.username || 'A contact'} sent you a friend request.`,
            is_read: false
        }]);
    } catch (notifErr) {
        if (__DEV__) console.warn("Notification failed to send:", notifErr);
    }

    DeviceEventEmitter.emit('friend_requests_changed');
};

export const cancelContactFriendRequest = async (currentUserId: string, receiverId: string) => {
    const { error: requestError } = await supabase
        .from('friend_requests')
        .delete()
        .eq('sender_id', currentUserId)
        .eq('receiver_id', receiverId)
        .eq('status', 'pending');

    if (requestError) {
        throw new Error(requestError.message);
    }

    DeviceEventEmitter.emit('friend_requests_changed');
};
