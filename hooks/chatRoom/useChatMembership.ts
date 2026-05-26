import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/store/useChatStore';

export const useChatMembership = (friendId: string, currentUser: any, isGroup: boolean) => {
    const [isMember, setIsMember] = useState(true);
    const { initChat } = useChatStore();

    useEffect(() => {
        if (!friendId || !currentUser) {
            console.log('[DEBUG] ChatRoom: Missing ID or User, skipping init.');
            return;
        }

        console.log('[DEBUG] ChatRoom: Initializing for friend:', friendId);
        initChat(friendId, currentUser, isGroup);

        const checkMembership = async () => {
            if (!isGroup) {
                setIsMember(true);
                return;
            }
            const { data } = await supabase
                .from('group_members')
                .select('id')
                .eq('group_id', friendId)
                .eq('user_id', currentUser.id)
                .maybeSingle();

            setIsMember(!!data);
        };

        checkMembership();

        if (!isGroup) return;

        // Unique membership channel name
        const mChannelName = `membership-${friendId}-${currentUser.id}`;
        console.log('[DEBUG] ChatRoom: Subscribing to membership:', mChannelName);
        const membershipChannel = supabase.channel(mChannelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'group_members',
                    filter: `group_id=eq.${friendId}`
                },
                () => {
                    console.log('[DEBUG] ChatRoom: Membership change detected');
                    checkMembership();
                }
            )
            .subscribe((status) => {
                console.log('[DEBUG] ChatRoom: Membership Channel Status:', status);
            });

        return () => {
            console.log('[DEBUG] ChatRoom: Cleaning up membership channel');
            supabase.removeChannel(membershipChannel);
        };
    }, [friendId, currentUser?.id, isGroup]);

    return isMember;
};
