import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '@/lib/supabase';
import { useFriendsStore } from '@/store/useFriendsStore';

interface UseHomeMenuActionsProps {
    currentUser: any;
    onRequireLockSetup: (friend: any) => void;
    onRequireLockVerify: (friend: any) => void;
}

export const useHomeMenuActions = ({ currentUser, onRequireLockSetup, onRequireLockVerify }: UseHomeMenuActionsProps) => {
    const router = useRouter();

    const handleMenuAction = async (action: string, friend: any) => {
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
                const storedPassword = await SecureStore.getItemAsync('chat_lock_password');
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
            default:
                console.log('Action not implemented:', action);
        }
    };

    return { handleMenuAction };
};
