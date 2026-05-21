import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { uploadChatMessageMedia } from '@/utils/uploadHelper';

export const useStatusActions = (currentUser: any, loadFriends?: () => void) => {
    const router = useRouter();
    const [viewingStatus, setViewingStatus] = useState<any>(null);
    const [statusIndex, setStatusIndex] = useState(0);
    const [showAddStatus, setShowAddStatus] = useState(false);
    const [uploadingStatus, setUploadingStatus] = useState(false);
    const [statusViewers, setStatusViewers] = useState<any[]>([]);

    const handleFetchViewers = useCallback(async (statusId: string) => {
        try {
            // Optimized single query joining status_views with profiles
            const { data: views, error } = await supabase
                .from('status_views')
                .select('viewed_at, viewer_id, profiles!viewer_id(id, username, avatar_url)')
                .eq('status_id', statusId)
                .order('viewed_at', { ascending: false });

            if (error) throw error;
            
            if (views && views.length > 0) {
                const combined = views.map((v: any) => {
                    const profile = Array.isArray(v.profiles) ? v.profiles[0] : v.profiles;
                    return {
                        id: profile?.id || v.viewer_id,
                        username: profile?.username || 'Unknown User',
                        avatar_url: profile?.avatar_url,
                        viewed_at: v.viewed_at
                    };
                });
                setStatusViewers(combined);
            } else {
                setStatusViewers([]);
            }
        } catch (error) {
            if (__DEV__) console.error("Error fetching viewers:", error);
            setStatusViewers([]);
        }
    }, []);

    const handleAddStatus = useCallback(async ({ type, content, bgcolor, file }: any) => {
        if (!currentUser) return;
        setUploadingStatus(true);
        try {
            let mediaUrl = null;
            if (file) {
                const ext = file.split('.').pop()?.toLowerCase() || 'jpg';
                const folder = type === 'video' ? 'status_videos' : 'status_images';
                mediaUrl = await uploadChatMessageMedia(file, 'chat_media', folder, type);
                if (!mediaUrl) throw new Error("Failed to upload media");
            }

            const { error } = await supabase.from('statuses').insert([{
                user_id: currentUser.id,
                content,
                media_type: type,
                media_url: mediaUrl,
                background_color: bgcolor
                // Removed client-side expires_at computation. Rely on Postgres defaults or trigger.
            }]);

            if (error) throw error;
            Alert.alert('Success', 'Status added! 🎉');
            setShowAddStatus(false);
            loadFriends?.();
        } catch (error: any) {
            if (__DEV__) console.error("Status Upload Error:", error);
            Alert.alert('Error', error.message || 'Failed to add status');
        } finally {
            setUploadingStatus(false);
        }
    }, [currentUser, loadFriends]);

    const handleViewUserStatus = useCallback(async (data: any) => {
        if (!currentUser) return;

        // Handle history bundles or direct friends
        const uid = data.id || data.userId || (data.statuses ? currentUser.id : null);
        if (!uid) return;

        router.push({
            pathname: '/status/viewer' as any,
            params: {
                userId: uid,
                initialIndex: 0,
                isArchive: data.statuses ? 'true' : 'false',
                date: data.dateKey || ''
            }
        });
    }, [currentUser]);

    const setShowAddStatusProxy = useCallback((show: boolean) => {
        if (show) {
            router.push('/status/add' as any);
        }
    }, [router]);

    // Track viewing and mark as seen
    const currentUserRef = useRef(currentUser);
    useEffect(() => {
        currentUserRef.current = currentUser;
    }, [currentUser]);

    useEffect(() => {
        if (!viewingStatus || !currentUserRef.current) return;
        const currentId = viewingStatus.statuses?.[statusIndex]?.id;
        if (!currentId) return;

        // View tracking without reloading all friends on every swipe
        supabase.from('status_views').upsert([{
            status_id: currentId,
            viewer_id: currentUserRef.current.id
        }], { onConflict: 'status_id,viewer_id' }).then(({ error }) => {
            if (__DEV__ && error && error.code !== '23505') {
                console.error("View tracking error:", error);
            }
        });
    }, [viewingStatus, statusIndex]); // Removed loadFriends to prevent infinite loop and over-fetching

    const handleNextStatus = useCallback(() => {
        if (!viewingStatus) return;
        if (statusIndex < viewingStatus.statuses.length - 1) {
            setStatusIndex(statusIndex + 1);
        } else {
            setViewingStatus(null);
        }
    }, [viewingStatus, statusIndex]);

    const handleViewMyStatus = useCallback(() => {
        if (!currentUser) return;
        router.push({
            pathname: '/status/viewer' as any,
            params: { userId: currentUser.id, initialIndex: 0, isArchive: 'false' }
        });
    }, [currentUser, router]);

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
