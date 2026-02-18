import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

export const useSentRequests = () => {
    const [sentRequests, setSentRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSentRequests();

        const channel = supabase
            .channel('sent-requests')
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'friend_requests'
                },
                () => {
                    loadSentRequests();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const loadSentRequests = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('friend_requests')
                .select(`
          *,
          receiver:profiles!friend_requests_receiver_id_fkey(
            id,
            username,
            email,
            phone,
            avatar_url
          )
        `)
                .eq('sender_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSentRequests(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const cancelRequest = async (requestId: string) => {
        try {
            const { error } = await supabase
                .from('friend_requests')
                .delete()
                .eq('id', requestId);

            if (error) throw error;
            loadSentRequests();
            Alert.alert('Success', 'Request cancelled');
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
            loadSentRequests();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const getCounts = () => ({
        pending: sentRequests.filter(r => r.status === 'pending').length,
        accepted: sentRequests.filter(r => r.status === 'accepted').length,
        rejected: sentRequests.filter(r => r.status === 'rejected').length,
        total: sentRequests.length
    });

    return {
        sentRequests,
        loading,
        cancelRequest,
        deleteRequest,
        getCounts,
        refresh: loadSentRequests
    };
};
