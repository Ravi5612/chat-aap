import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export const useDisappearingMessages = (
    currentUser: any,
    safeFriendId: string,
    friendData: any,
    handleSendMessageOriginal: any
) => {
    const [disappearingModalVisible, setDisappearingModalVisible] = useState(false);
    const disappearingDuration = friendData?.disappearing_duration || 0;

    const handleSetDisappearingDuration = async (duration: number) => {
        if (!currentUser?.id || !safeFriendId) return;
        try {
            await supabase.from('friendships').update({ disappearing_duration: duration })
                .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${safeFriendId}),and(user_id.eq.${safeFriendId},friend_id.eq.${currentUser.id})`);
            
            const infoText = duration === 0 
                ? `${currentUser.user_metadata?.username || 'User'} turned off disappearing messages.`
                : `${currentUser.user_metadata?.username || 'User'} set disappearing messages to ${duration === 86400 ? '24 Hours' : (duration === 604800 ? '7 Days' : '30 Days')}.`;
            
            await handleSendMessageOriginal(infoText, undefined, undefined, 'info');
        } catch (error) {
            console.error('Failed to set disappearing duration', error);
        }
    };

    return {
        disappearingDuration,
        disappearingModalVisible,
        setDisappearingModalVisible,
        handleSetDisappearingDuration
    };
};
