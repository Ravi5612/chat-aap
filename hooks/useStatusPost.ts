import { useState, useRef } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { encryptText, generateStatusMasterKey, encryptKeyWithSharedSecret } from '../utils/chatCrypto';
import { useFriendsStore } from '../store/useFriendsStore';
import { uploadChatMessageMedia } from '@/utils/uploadHelper';
import { getChatKey } from '@/utils/chatCrypto';
import { useRouter } from 'expo-router';
import * as VideoThumbnails from 'expo-video-thumbnails';

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
                        let thumbnailUrl = null;
                        let storagePaths: string[] = [];

                        const statusKey = await generateStatusMasterKey();

                        if (selectedMedia) {
                            const uploadResult = await uploadChatMessageMedia(
                                selectedMedia.uri, 
                                mediaType as "video" | "image",
                                user.id,
                                undefined,
                                undefined,
                                undefined,
                                statusKey
                            );
                            
                            let finalUrl = uploadResult.url;
                            if (mediaType === 'video' && duration > 0) {
                                finalUrl += `?trim_start=${trimStart}&trim_end=${trimEnd}`;
                            }
                            mediaUrl = finalUrl;
                            storagePaths.push(`${user.id}/${uploadResult.name}`);

                            if (mediaType === 'video') {
                                try {
                                    const { uri } = await VideoThumbnails.getThumbnailAsync(
                                        selectedMedia.uri,
                                        { time: 1000 }
                                    );
                                    
                                    const thumbUploadResult = await uploadChatMessageMedia(
                                        uri, 
                                        'image',
                                        user.id,
                                        `thumb_${Date.now()}.jpg`,
                                        undefined,
                                        undefined,
                                        statusKey
                                    );
                                    thumbnailUrl = thumbUploadResult.url;
                                    storagePaths.push(`${user.id}/${thumbUploadResult.name}`);
                                } catch (e) {
                                    console.warn('Failed to generate thumbnail', e);
                                }
                            }
                        }

                        const encryptedContent = content.trim() ? await encryptText(content.trim(), statusKey) : null;
                        const encryptedMediaUrl = mediaUrl ? (mediaUrl.includes('.e2ee.txt') ? mediaUrl : await encryptText(mediaUrl, statusKey)) : null;
                        const encryptedThumbnailUrl = thumbnailUrl ? (thumbnailUrl.includes('.e2ee.txt') ? thumbnailUrl : await encryptText(thumbnailUrl, statusKey)) : null;
                        const encryptedAudioUrl = selectedMusic ? await encryptText(JSON.stringify(selectedMusic), statusKey) : null;

                        // Hybrid Encryption: Encrypt the Master Key for all allowed viewers + self
                        const finalViewerIds = privacy === 'selected' ? selectedViewerIds : friendsStore.friends.map((f: any) => f.id);
                        const { data: viewerProfiles } = await supabase.from('profiles').select('id, public_key').in('id', finalViewerIds);
                        
                        const encryptedKeys: Record<string, string> = {};
                        
                        // Self
                        const { data: myProfile } = await supabase.from('profiles').select('public_key').eq('id', user.id).single();
                        if (myProfile?.public_key) {
                            const myEnc = await encryptKeyWithSharedSecret(statusKey, myProfile.public_key, user.id);
                            if (myEnc) encryptedKeys[user.id] = myEnc;

                            if (viewerProfiles && viewerProfiles.length > 0) {
                                // Encrypt in parallel for speed, but batch if needed. For now, Promise.all is much faster than sequential.
                                await Promise.all(viewerProfiles.map(async (p: any) => {
                                    if (p.public_key) {
                                        try {
                                            const enc = await encryptKeyWithSharedSecret(statusKey, p.public_key, user.id);
                                            if (enc) encryptedKeys[p.id] = enc;
                                        } catch (e) {
                                            console.warn('Failed to encrypt status key for friend', p.id, e);
                                        }
                                    }
                                }));
                            }
                        }

                        const statusData = {
                            user_id: user.id,
                            content: encryptedContent,
                            media_type: mediaType,
                            media_url: encryptedMediaUrl,
                            thumbnail_url: encryptedThumbnailUrl,
                            audio_url: encryptedAudioUrl,
                            storage_paths: storagePaths,
                            background_color: selectedMedia ? null : bgColor,
                            expires_at: tempStatus.expires_at,
                            is_deleted: false,
                            privacy_type: privacy,
                            viewer_ids: privacy === 'selected' ? selectedViewerIds : null,
                            mentioned_user_ids: mentionedFriends?.map(f => f.id) || [],
                            encrypted_keys: encryptedKeys
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
