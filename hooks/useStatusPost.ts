import { useState, useRef } from 'react';
import { Alert } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useFriendsStore } from '../store/useFriendsStore';
import { useRouter } from 'expo-router';
import { processStatusUpload } from '@/services/status/statusUploadService';

export function useStatusPost(
    content: string,
    selectedMedia: any,
    bgColor: string,
    privacy: 'all' | 'selected',
    selectedViewerIds: string[],
    duration: number,
    trimStart: number,
    trimEnd: number,
    selectedMusic?: any,
    mentionedFriends?: any[]
) {
    const [loading, setLoading] = useState(false);
    const isSubmittingRef = useRef(false);
    const router = useRouter();

    const handlePost = async () => {
        if (!content.trim() && !selectedMedia) return;
        if (isSubmittingRef.current) return;
        
        isSubmittingRef.current = true;
        setLoading(true);

        try {
            const user = useAuthStore.getState().user;
            if (!user) throw new Error('Not logged in');

            const tempId = 'temp-' + Date.now();
            const mediaType = selectedMedia ? (selectedMedia.type === 'video' || selectedMedia.uri.toLowerCase().endsWith('.mp4') ? 'video' : 'image') : 'text';
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            
            const tempStatus = {
                id: tempId,
                user_id: user.id,
                content: content.trim() || null,
                media_type: mediaType,
                media_url: selectedMedia?.uri || null,
                background_color: selectedMedia ? null : bgColor,
                created_at: new Date().toISOString(),
                expires_at: expiresAt,
                is_deleted: false,
                isUploading: true
            };

            const friendsStore = useFriendsStore.getState();
            const currentMyStatuses = friendsStore.myStatuses || { active: [] };
            
            friendsStore.setOnlineUsers(friendsStore.onlineUsers);
            useFriendsStore.setState({
                myStatuses: {
                    ...currentMyStatuses,
                    active: [tempStatus, ...(currentMyStatuses.active || [])]
                }
            });

            router.back();

            // Fire and forget background task
            setTimeout(() => {
                processStatusUpload({
                    user,
                    tempId,
                    content,
                    mediaType,
                    selectedMedia,
                    bgColor,
                    privacy,
                    selectedViewerIds,
                    duration,
                    trimStart,
                    trimEnd,
                    selectedMusic,
                    mentionedFriends,
                    expiresAt
                }).finally(() => {
                    isSubmittingRef.current = false;
                    setLoading(false);
                });
            }, 800);

        } catch (error: any) {
            console.error('AddStatus Initialization Error:', error);
            Alert.alert('Error', error.message || 'Failed to initialize status post');
            isSubmittingRef.current = false;
            setLoading(false);
        }
    };

    return { handlePost, loading, isSubmittingRef };
}
