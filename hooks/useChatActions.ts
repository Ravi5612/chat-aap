import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { useDbStore } from '@/store/useDbStore';
import { useChatStore } from '@/store/useChatStore';
import { useFriendsStore } from '@/store/useFriendsStore';
import {
    saveChatClearTimestamp,
    clearLocalChat,
    saveLocalMessage,
    saveLocalWallpaper
} from '@/lib/localDb';

export function useChatActions(
    currentUser: any,
    safeFriendId: string,
    roomId: string,
    friendName: string,
    isGroup: boolean,
    isBlocked: boolean,
    setWallpaper: (uri: string) => void
) {
    const handleClearChat = async () => {
        Alert.alert("Clear Chat", "Are you sure you want to clear this chat for yourself? (Friend will still see the messages)", [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Clear for Me", 
                style: "destructive", 
                onPress: async () => {
                    try {
                        const now = new Date().toISOString();
                        const { db } = useDbStore.getState();

                        if (db) {
                            await saveChatClearTimestamp(db, safeFriendId, now);
                            await clearLocalChat(db, safeFriendId, isGroup);
                        }

                        useChatStore.setState((state) => {
                            const newCache = { ...state.cache };
                            if (newCache[safeFriendId]) {
                                newCache[safeFriendId] = { ...newCache[safeFriendId], messages: [] };
                            }
                            return { messages: [], cache: newCache };
                        });

                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        Alert.alert("Success", "Chat cleared for you.");
                    } catch (e: any) {
                        console.error('[CHAT] Clear for me failed:', e);
                        Alert.alert("Error", `Failed to clear chat locally: ${e.message || 'Unknown error'}`);
                    }
                } 
            }
        ]);
    };

    const handleBlockToggle = async () => {
        if (!currentUser) return;
        const { blockUser, unblockUser } = useFriendsStore.getState();
        if (isBlocked) {
            await unblockUser(currentUser.id, safeFriendId);
        } else {
            Alert.alert("Block User", `Are you sure you want to block ${friendName}?`, [
                { text: "Cancel", style: "cancel" },
                { text: "Block", style: "destructive", onPress: async () => { await blockUser(currentUser.id, safeFriendId); } }
            ]);
        }
    };

    const handleUnfriend = () => {
        Alert.alert(
            "Unfriend",
            `Kya aap sach me ${friendName} ko unfriend karna chahte ho? Dono ek dusre ko message nahi kar payenge jab tak dobara request na ho.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Unfriend",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            if (!currentUser) return;
                            const { error } = await supabase
                                .from('friendships')
                                .delete()
                                .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${safeFriendId}),and(user_id.eq.${safeFriendId},friend_id.eq.${currentUser.id})`);

                            if (error) throw error;

                            const { db } = useDbStore.getState();
                            if (db) {
                                await db.runAsync(
                                    "UPDATE conversations SET last_message = last_message WHERE id = ?",
                                    [safeFriendId]
                                );
                            }

                            useFriendsStore.setState((state) => ({
                                friends: state.friends.filter(f => f.id !== safeFriendId),
                                combinedItems: state.combinedItems.map(f =>
                                    f.id === safeFriendId ? { ...f, isUnfriended: true } : f
                                )
                            }));

                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            Alert.alert("Unfriended", `${friendName} ko unfriend kar diya.`);
                        } catch (e: any) {
                            console.error('[CHAT] Unfriend failed:', e);
                            Alert.alert("Error", `Unfriend nahi ho saka: ${e.message || 'Unknown error'}`);
                        }
                    }
                }
            ]
        );
    };

    const handleSetWallpaper = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [9, 16],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0].uri && currentUser?.id && roomId) {
            const tempUri = result.assets[0].uri;
            try {
                const { db } = useDbStore.getState();
                const filename = `wallpaper_${roomId}.jpg`;
                const permanentUri = `${FileSystem.documentDirectory}${filename}`;
                
                await FileSystem.copyAsync({ from: tempUri, to: permanentUri });
                
                setWallpaper(permanentUri);
                if (db) await saveLocalWallpaper(db, roomId, permanentUri);

                const formData = new FormData();
                formData.append('file', { uri: tempUri, type: 'image/jpeg', name: 'wallpaper.jpg' } as any);
                formData.append('upload_preset', 'lrkgj8fj');
                
                const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/do6lyfmn4/image/upload`, { method: 'POST', body: formData });
                const cloudData = await cloudRes.json();
                const remoteUrl = cloudData.secure_url;

                if (remoteUrl) {
                    const systemMsg = {
                        id: `system_${Date.now()}`,
                        sender_id: currentUser.id,
                        receiver_id: isGroup ? null : safeFriendId,
                        group_id: isGroup ? safeFriendId : null,
                        message: `SYSTEM_MSG: ✨ ${currentUser.username || currentUser.full_name || 'Someone'} changed the chat wallpaper`,
                        status: 'sent',
                        created_at: new Date().toISOString(),
                    };

                    const { data: remoteData } = await supabase
                        .from('messages')
                        .insert([{ ...systemMsg, id: undefined }])
                        .select()
                        .single();

                    await supabase.from('chat_wallpapers').upsert({ 
                        chat_id: roomId, 
                        wallpaper_url: remoteUrl, 
                        user_id: currentUser.id 
                    });

                    if (db) {
                        await saveLocalMessage(db, remoteData || systemMsg);
                    }

                    Alert.alert("Success", "Wallpaper updated for everyone!");
                }
            } catch (error) {
                console.error("Wallpaper Sync Error:", error);
                Alert.alert("Sync Error", "Failed to update shared wallpaper, but it's saved locally.");
            }
        }
    };

    return {
        handleClearChat,
        handleBlockToggle,
        handleUnfriend,
        handleSetWallpaper
    };
}
