import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AppStorage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useFriendsStore } from '@/store/useFriendsStore';

interface UseHomeMenuActionsProps {
    currentUser: any;
    onRequireLockSetup: (friend: any) => void;
    onRequireLockVerify: (friend: any) => void;
}

export const useHomeMenuActions = ({ currentUser, onRequireLockSetup, onRequireLockVerify }: UseHomeMenuActionsProps) => {
    const router = useRouter();

    const handleMenuAction = useCallback(async (action: string, friend: any) => {
        Haptics.selectionAsync();
        
        switch (action) {
            case 'profile':
                router.push(`/profile/${friend.id}` as any);
                break;
            case 'group':
                if (friend.isGroup) {
                    Alert.alert("Coming Soon", "Group management is under construction.");
                } else {
                    router.push(`/new-group?initialMemberId=${friend.id}` as any);
                }
                break;
            case 'block':
                Alert.alert(
                    "Block User",
                    `Are you sure you want to block ${friend.name}? They will not be able to message or call you.`,
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Block",
                            style: "destructive",
                            onPress: async () => {
                                const { blockUser } = useFriendsStore.getState();
                                await blockUser(currentUser.id, friend.id);
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            }
                        }
                    ]
                );
                break;
            case 'unblock':
                Alert.alert(
                    "Unblock User",
                    `Are you sure you want to unblock ${friend.name}?`,
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Unblock",
                            onPress: async () => {
                                const { unblockUser } = useFriendsStore.getState();
                                await unblockUser(currentUser.id, friend.id);
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            }
                        }
                    ]
                );
                break;
            case 'unfriend':
                Alert.alert(
                    "Unfriend",
                    `Kya aap sach me ${friend.name} ko unfriend karna chahte ho?`,
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Unfriend",
                            style: "destructive",
                            onPress: async () => {
                                try {
                                    const { error } = await supabase
                                        .from('friendships')
                                        .delete()
                                        .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${friend.id}),and(user_id.eq.${friend.id},friend_id.eq.${currentUser.id})`);
                                    if (error) throw error;
                                    useFriendsStore.setState((state) => ({
                                        friends: state.friends.filter(f => f.id !== friend.id),
                                        combinedItems: state.combinedItems.map(f => f.id === friend.id ? { ...f, isUnfriended: true } : f)
                                    }));
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                } catch (e: any) {
                                    Alert.alert("Error", `Unfriend nahi ho saka: ${e.message}`);
                                }
                            }
                        }
                    ]
                );
                break;
            case 'delete':
                Alert.alert(
                    "Delete Chat",
                    `Are you sure you want to delete your chat with ${friend.name}? This will only delete the chat for you.`,
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Delete for Me",
                            style: "destructive",
                            onPress: async () => {
                                try {
                                    useFriendsStore.setState((state) => ({
                                        combinedItems: state.combinedItems.filter(i => i.id !== friend.id)
                                    }));
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                } catch (e) {
                                    Alert.alert("Error", "Failed to clear chat");
                                }
                            }
                        }
                    ]
                );
                break;
            case 'lock':
                const storedPassword = await AppStorage.getItemAsync('chat_lock_password');
                if (!storedPassword) {
                    onRequireLockSetup(friend);
                } else {
                    const { lockChat } = useFriendsStore.getState();
                    await lockChat(friend.id);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Alert.alert("Chat Locked", "This chat is now moved to the Locked tab.");
                }
                break;
            case 'unlock':
                onRequireLockVerify(friend);
                break;
            case 'hide':
                const vaultPasscode = useFriendsStore.getState().vaultPasscode;
                if (!vaultPasscode) {
                    Alert.alert(
                        "Ninja Vault Setup Required",
                        "You haven't set up your Ninja Vault passcode yet. Please go to Profile -> Privacy to set it up.",
                        [
                            { text: "Cancel", style: "cancel" },
                            { text: "Go to Profile", onPress: () => router.push('/profile' as any) }
                        ]
                    );
                } else {
                    const { toggleChatHiddenStatus } = useFriendsStore.getState();
                    await toggleChatHiddenStatus(friend.id, friend.isGroup, true);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Alert.alert("Chat Hidden", "This chat is now in your Ninja Vault. Search your passcode to view it.");
                }
                break;
            case 'unhide':
                const { toggleChatHiddenStatus } = useFriendsStore.getState();
                await toggleChatHiddenStatus(friend.id, friend.isGroup, false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert("Chat Unhidden", "This chat is now visible in your main list.");
                break;
            default:
                console.log('Action not implemented:', action);
        }
    }, [currentUser, router, onRequireLockSetup, onRequireLockVerify]);

    return { handleMenuAction };
};
