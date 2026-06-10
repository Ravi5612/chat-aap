import { supabase } from '@/lib/supabase';
export const sendFriendRequest = async (currentUserId: string, targetFriendId: string) => {
    const { useAuthStore } = require('@/store/useAuthStore');
    const { error } = await supabase
        .from('friend_requests')
        .insert([{
            sender_id: currentUserId,
            receiver_id: targetFriendId,
            status: 'pending'
        }]);

    if (error) {
        if (error.code === '23505') { // unique violation
            return true;
        }
        throw error;
    }

    const myProfile = useAuthStore.getState().profile;
    
    try {
        await supabase.from('notifications').insert([{
            user_id: targetFriendId,
            sender_id: currentUserId,
            type: 'friend_request',
            message: `${myProfile?.username || 'Someone'} sent you a friend request.`,
            is_read: false
        }]);
    } catch (e) {
        console.warn('Friend request succeeded, but failed to send notification:', e);
    }

    return true;
};
