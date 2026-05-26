import { useState, useRef } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useFriendsStore } from '@/store/useFriendsStore';
import { uploadChatMessageMedia } from '@/utils/uploadHelper';
import { encryptText, getChatKey } from '@/utils/chatCrypto';
import { useRouter } from 'expo-router';

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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not logged in');

            const tempId = 'temp-' + Date.now();
            const mediaType = selectedMedia ? (selectedMedia.type === 'video' || selectedMedia.uri.toLowerCase().endsWith('.mp4') ? 'video' : 'image') : 'text';
            
            const tempStatus = {
                id: tempId,
                user_id: user.id,
                content: content.trim() || null,
                media_type: mediaType,
                media_url: selectedMedia?.uri || null,
                background_color: selectedMedia ? null : bgColor,
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
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

            setTimeout(() => {
                (async () => {
                    try {
                        let mediaUrl = null;

                        if (selectedMedia) {
                            const uploadResult = await uploadChatMessageMedia(
                                selectedMedia.uri, 
                                mediaType as "video" | "image",
                                user.id
                            );
                            
                            let finalUrl = uploadResult.url;
                            if (mediaType === 'video' && duration > 0) {
                                finalUrl += `?trim_start=${trimStart}&trim_end=${trimEnd}`;
                            }
                            mediaUrl = finalUrl;
                        }

                        const statusKey = await getChatKey(user.id, user.id); 

                        const encryptedContent = content.trim() ? await encryptText(content.trim(), statusKey) : null;
                        const encryptedMediaUrl = mediaUrl ? await encryptText(mediaUrl, statusKey) : null;
                        const encryptedAudioUrl = selectedMusic ? await encryptText(JSON.stringify(selectedMusic), statusKey) : null;

                        const statusData = {
                            user_id: user.id,
                            content: encryptedContent,
                            media_type: mediaType,
                            media_url: encryptedMediaUrl,
                            audio_url: encryptedAudioUrl,
                            background_color: selectedMedia ? null : bgColor,
                            expires_at: tempStatus.expires_at,
                            is_deleted: false,
                            privacy_type: privacy,
                            viewer_ids: privacy === 'selected' ? selectedViewerIds : null,
                            mentioned_user_ids: mentionedFriends?.map(f => f.id) || []
                        };

                        const { error, data: insertedStatus } = await supabase.from('statuses').insert([statusData]).select().single();
                        if (error) throw error;

                        if (mentionedFriends && mentionedFriends.length > 0 && insertedStatus?.id) {
                            const mentionsToInsert = await Promise.all(mentionedFriends.map(async (friend) => {
                                const dmKey = await getChatKey(user.id, friend.id);
                                const mentionMsg = `[StatusMention] ${insertedStatus.id}`;
                                const encryptedMsg = await encryptText(mentionMsg, dmKey);
                                return {
                                    sender_id: user.id,
                                    receiver_id: friend.id,
                                    message: encryptedMsg,
                                    message_type: 'text',
                                    status: 'sent',
                                    created_at: new Date().toISOString()
                                };
                            }));
                            
                            if (mentionsToInsert.length > 0) {
                                const { error: mentionError } = await supabase.from('messages').insert(mentionsToInsert);
                                if (mentionError) console.error('Failed to send status mention DMs:', mentionError);
                            }
                        }

                        await friendsStore.loadFriends(user.id, true);

                    } catch (error: any) {
                        console.error('Background status upload failed:', error);
                        Alert.alert('Status Failed', 'Failed to upload your status. Please try again.');

                        const refreshedStore = useFriendsStore.getState();
                        const currentActive = refreshedStore.myStatuses?.active || [];
                        useFriendsStore.setState({
                            myStatuses: {
                                ...refreshedStore.myStatuses,
                                active: currentActive.filter((s: any) => s.id !== tempId)
                            }
                        });
                    } finally {
                        isSubmittingRef.current = false;
                        setLoading(false);
                    }
                })();
            }, 500);

        } catch (error: any) {
            console.error('AddStatus Initialization Error:', error);
            Alert.alert('Error', error.message || 'Failed to initialize status post');
            isSubmittingRef.current = false;
            setLoading(false);
        }
    };

    return { handlePost, loading, isSubmittingRef };
}
