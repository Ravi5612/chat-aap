import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

export const useReceivedRequests = () => {
    const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReceivedRequests();

        const channel = supabase
            .channel('received-requests')
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'friend_requests'
                },
                () => {
                    loadReceivedRequests();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const loadReceivedRequests = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('friend_requests')
                .select(`
          *,
          sender:profiles!friend_requests_sender_id_fkey(
            id,
            username,
            email,
            phone,
            avatar_url
          )
        `)
                .eq('receiver_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReceivedRequests(data || []);
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

            await supabase.from('friendships').insert([
                { user_id: user.id, friend_id: senderId },
                { user_id: senderId, friend_id: user.id }
            ]);

            const { data: myProfile } = await supabase.from('profiles').select('username').eq('id', user.id).single();

            await supabase.from('notifications').insert([
                {
                    user_id: senderId,
                    sender_id: user.id,
                    type: 'friend_accepted',
                    message: `${myProfile?.username || 'Someone'} accepted your friend request! 🤝`,
                    is_read: false
                }
            ]);

            await loadReceivedRequests();
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
