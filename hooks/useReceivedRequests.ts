import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Alert, DeviceEventEmitter } from 'react-native';
import { getFromCache, saveToCache } from '@/lib/database';

export const useReceivedRequests = () => {
    const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let channel: any;

        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            loadReceivedRequests();

            channel = supabase
                .channel(`received-requests-${user.id}`)
                .on('postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'friend_requests',
                        filter: `receiver_id=eq.${user.id}`
                    },
                    () => {
                        loadReceivedRequests();
                    }
                )
                .subscribe();
        };

        init();
        
        const eventSub = DeviceEventEmitter.addListener('friend_requests_changed', loadReceivedRequests);

        return () => {
            if (channel) supabase.removeChannel(channel);
            eventSub.remove();
        };
    }, []);

    const loadReceivedRequests = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Load from cache instantly
            try {
                const cached = getFromCache(`received_requests_${user.id}`);
                if (cached) {
                    setReceivedRequests(cached);
                    setLoading(false);
                }
            } catch(e) {}

            const { data, error } = await supabase
                .from('friend_requests')
                .select(`
          *,
          sender:profiles!friend_requests_sender_id_fkey(
            id,
            username,
            email,
            phone,
            avatar_url,
            gender
          )
        `)
                .eq('receiver_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReceivedRequests(data || []);
            
            // Save to cache silently
            try {
                saveToCache(`received_requests_${user.id}`, data || []);
            } catch(e) {}
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const acceptRequest = async (requestId: string, senderId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error: updateError } = await supabase
                .from('friend_requests')
                .update({ status: 'accepted' })
                .eq('id', requestId);

            if (updateError) throw updateError;

            const { error: err1 } = await supabase.from('friendships').insert(
                { user_id: user.id, friend_id: senderId }
            );
            if (err1 && err1.code !== '23505') {
                console.error("Friendship insert error:", err1);
                throw new Error("Failed to add friend: " + err1.message);
            }

            const { data: myProfile } = await supabase.from('profiles').select('username').eq('id', user.id).single();

            const { error: notifErr } = await supabase.from('notifications').insert([
                {
                    user_id: senderId,
                    sender_id: user.id,
                    type: 'friend_accepted',
                    message: `${myProfile?.username || 'Someone'} accepted your friend request! 🤝`,
                    is_read: false
                }
            ]);
            if (notifErr) console.error(notifErr);

            await loadReceivedRequests();
            
            // Instantly update the home page friends list
            const { useFriendsStore } = require('@/store/useFriendsStore');
            useFriendsStore.getState().loadFriends(user.id, true);

            Alert.alert('Success', 'Friend Request Accepted! 🤝');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const rejectRequest = async (requestId: string) => {
        try {
            const { error } = await supabase
                .from('friend_requests')
                .update({ status: 'rejected' })
                .eq('id', requestId);

            if (error) throw error;
            loadReceivedRequests();
            Alert.alert('Success', 'Friend request rejected');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const deleteRequest = async (requestId: string) => {
        try {
            const { error } = await supabase
                .from('friend_requests')
                .delete()
                .eq('id', requestId);

            if (error) throw error;
            loadReceivedRequests();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const getCounts = () => ({
        pending: receivedRequests.filter(r => r.status === 'pending').length,
        accepted: receivedRequests.filter(r => r.status === 'accepted').length,
        rejected: receivedRequests.filter(r => r.status === 'rejected').length,
        total: receivedRequests.length
    });

    return {
        receivedRequests,
        loading,
        acceptRequest,
        rejectRequest,
        deleteRequest,
        getCounts,
        refresh: loadReceivedRequests
    };
};
