import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Alert, DeviceEventEmitter } from 'react-native';
import { getFromCache, saveToCache } from '@/lib/database';
import { useAuthStore } from '@/store/useAuthStore';

export const useSentRequests = () => {
    const { user } = useAuthStore();
    const [sentRequests, setSentRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let channel: any;

        const init = async () => {
            if (!user) return;

            loadSentRequests();

            channel = supabase
                .channel(`sent-requests-${user.id}`)
                .on('postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'friend_requests',
                        filter: `sender_id=eq.${user.id}`
                    },
                    () => {
                        loadSentRequests();
                    }
                )
                .subscribe();
        };

        init();
        
        const eventSub = DeviceEventEmitter.addListener('friend_requests_changed', loadSentRequests);

        return () => {
            if (channel) supabase.removeChannel(channel);
            eventSub.remove();
        };
    }, [user?.id]);

    const loadSentRequests = async () => {
        if (!user) return;

        // Load from cache instantly
        try {
            const cached = getFromCache(`sent_requests_${user.id}`);
            if (cached) {
                setSentRequests(cached);
                setLoading(false);
            }
        } catch(e) {}

        try {

            const { data, error } = await supabase
                .from('friend_requests')
                .select(`
          *,
          receiver:profiles!friend_requests_receiver_id_fkey(
            id,
            username,
            email,
            phone,
            avatar_url,
            gender
          )
        `)
                .eq('sender_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSentRequests(data || []);
            
            // Save to cache silently
            try {
                saveToCache(`sent_requests_${user.id}`, data || []);
            } catch(e) {}
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
