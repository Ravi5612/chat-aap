import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

export const useStatusActions = (currentUser: any, loadFriends?: () => void) => {
    const router = useRouter();
    const [viewingStatus, setViewingStatus] = useState<any>(null);
    const [statusIndex, setStatusIndex] = useState(0);
    const [showAddStatus, setShowAddStatus] = useState(false);
    const [uploadingStatus, setUploadingStatus] = useState(false);
    const [statusViewers, setStatusViewers] = useState<any[]>([]);

    const handleFetchViewers = useCallback(async (statusId: string) => {
        try {
            const { data: views, error } = await supabase
                .from('status_views')
                .select('viewed_at, viewer_id')
                .eq('status_id', statusId)
                .order('viewed_at', { ascending: false });

            if (error) throw error;
            if (views && views.length > 0) {
                const viewerIds = views.map(v => v.viewer_id);
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url')
                    .in('id', viewerIds);

                const profileMap = profiles?.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {}) || {};
                const combined = views.map(v => {
                    const profile = profileMap[v.viewer_id];
                    return {
                        ...(profile || { id: v.viewer_id, username: 'Unknown User' }),
                        viewed_at: v.viewed_at
                    };
                });
                setStatusViewers(combined);
            } else {
                setStatusViewers([]);
            }
        } catch (error) {
            console.error("Error fetching viewers:", error);
            setStatusViewers([]);
        }
    }, []);

    const handleAddStatus = async ({ type, content, bgcolor, file }: any) => {
        if (!currentUser) return;
        setUploadingStatus(true);
        try {
            // Simplified insert for now
            const { error } = await supabase.from('statuses').insert([{
                user_id: currentUser.id,
                content,
                media_type: type,
                media_url: file ? null : null, // Handle upload separately 
                background_color: bgcolor,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }]);

            if (error) throw error;
            Alert.alert('Success', 'Status added! 🎉');
            setShowAddStatus(false);
            loadFriends?.();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to add status');
        } finally {
            setUploadingStatus(false);
        }
    };

    const handleViewUserStatus = useCallback(async (friend: any) => {
        if (!currentUser) return;
        router.push({
            pathname: '/status/viewer' as any,
            params: { userId: friend.id, initialIndex: 0 }
        });
    }, [currentUser]);

    const setShowAddStatusProxy = (show: boolean) => {
        if (show) {
            router.push('/status/add' as any);
        }
    };

    // Track viewing and mark as seen
    useEffect(() => {
        if (!viewingStatus || !currentUser) return;
        const currentId = viewingStatus.statuses[statusIndex]?.id;
        if (!currentId) return;

        supabase.from('status_views').upsert([{
            status_id: currentId,
            viewer_id: currentUser.id
        }], { onConflict: 'status_id,viewer_id' }).then(({ error }) => {
            if (!error || error.code === '23505') {
                loadFriends?.();
            }
        });
    }, [viewingStatus, statusIndex, currentUser, loadFriends]);

    const handleNextStatus = () => {
        if (!viewingStatus) return;
        if (statusIndex < viewingStatus.statuses.length - 1) {
            setStatusIndex(statusIndex + 1);
        } else {
            setViewingStatus(null);
        }
    };

    const handleViewMyStatus = () => {
        if (!currentUser) return;
        router.push({
            pathname: '/status/viewer' as any,
            params: { userId: currentUser.id, initialIndex: 0 }
        });
    };

    return {
        viewingStatus,
        statusIndex,
        showAddStatus,
        uploadingStatus,
        statusViewers,
        setViewingStatus,
        setStatusIndex,
        setShowAddStatus: setShowAddStatusProxy,
        handleAddStatus,
        handleViewUserStatus,
        handleViewMyStatus,
        handleFetchViewers,
        handleNextStatus
    };
};
