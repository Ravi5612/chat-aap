import React, { useState, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform, Text, TouchableOpacity, ActivityIndicator, Alert, Clipboard, Keyboard, StatusBar, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useHeaderHeight } from '@react-navigation/elements';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import MessageList from '@/components/chat/MessageList';
import ChatInput from '@/components/chat/ChatInput';
import { supabase } from '@/lib/supabase';
import { useChatRoom } from '@/hooks/useChatRoom';
import ChatMenu from '@/components/chat/ChatMenu';
import MessageContextMenu from '@/components/chat/MessageContextMenu';
import ForwardMessageModal from '@/components/chat/ForwardMessageModal';
import MediaViewer from '@/components/chat/MediaViewer';
import CallScreen from '@/components/chat/CallScreen';
import { useCallManager } from '@/hooks/useCallManager';
import { usePresence } from '@/hooks/usePresence';
import { useAuthStore } from '@/store/useAuthStore';
import { useFriendsStore } from '@/store/useFriendsStore';
import * as Haptics from 'expo-haptics';

export default function ChatScreen() {
    const [keyboardOffset, setKeyboardOffset] = useState(0);
    const params = useLocalSearchParams<{ id: string, name: string, isGroup?: string, image?: string }>();
    const { id: friendId, name: friendName, isGroup, image: friendImage } = params;
    const router = useRouter();
    const { user: currentUser } = useAuthStore();
    const { blockedUserIds, blockUser, unblockUser, combinedItems } = useFriendsStore();
    const isBlocked = blockedUserIds.includes(friendId as string);

    const friendData = (combinedItems || []).find(f => f.id === friendId);

    const chatRoom = useChatRoom(friendId as string, currentUser, isGroup === 'true');
    const { isUserOnline } = usePresence(currentUser?.id);

    const {
        messages,
        loading,
        loadingMore,
        isTyping,
        handleSendMessage,
        handleTypingStatus,
        handleReact,
        handleSaveEdit,
        handleDeleteMessage,
        handleForwardMessage,
        flyingEmoji,
        isMember,
        handleLoadMore,
    } = chatRoom;

    // Call Management
    const {
        callSession,
        handleStartCall,
        setCallActive,
        endCall
    } = useCallManager(currentUser, [{ id: friendId, name: friendName, avatar_url: null }]);

    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [editingMessage, setEditingMessage] = useState<any>(null);
    const [menuVisible, setMenuVisible] = useState(false);

    // Message Context Menu State
    const [contextMenuVisible, setContextMenuVisible] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<any>(null);
    const [anchorY, setAnchorY] = useState(0);

    // Forward Modal State
    const [forwardModalVisible, setForwardModalVisible] = useState(false);
    const [forwardText, setForwardText] = useState('');

    // Media Viewer State
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerImage, setViewerImage] = useState<string | null>(null);

    const onSendMessage = (text: string) => {
        if (isBlocked) {
            Alert.alert("Blocked", "You have blocked this user. Unblock them to send messages.");
            return;
        }
        handleSendMessage(text, replyingTo?.id);
        setReplyingTo(null);
    };

    const onSaveEdit = (text: string) => {
        if (editingMessage) {
            handleSaveEdit(editingMessage.id, text);
            setEditingMessage(null);
        }
    };

    const handleClearChat = async () => {
        Alert.alert(
            "Clear Chat",
            "Are you sure you want to clear all messages? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear",
                    style: "destructive",
                    onPress: async () => {
                        await supabase.from('messages').delete().or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUser.id})`);
                    }
                }
            ]
        );
    };

    const handleBlockToggle = async () => {
        if (!currentUser) return;
        if (isBlocked) {
            await unblockUser(currentUser.id, friendId as string);
            Alert.alert("Unblocked", `${friendName} has been unblocked.`);
        } else {
            Alert.alert(
                "Block User",
                `Are you sure you want to block ${friendName}? You will not receive messages from them.`,
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Block",
                        style: "destructive",
                        onPress: async () => {
                            await blockUser(currentUser.id, friendId as string);
                            Alert.alert("Blocked", `${friendName} has been blocked.`);
                        }
                    }
                ]
            );
        }
    };

    const handleViewProfile = () => {
        router.push(`/profile/${friendId}` as any);
    };

    const handleLongPress = (message: any, y: number) => {
        setSelectedMessage(message);
        setAnchorY(y);
        setContextMenuVisible(true);
    };

    const handleMessageAction = (action: string) => {
        if (!selectedMessage) return;

        switch (action) {
            case 'reply':
                setReplyingTo(selectedMessage);
                setEditingMessage(null);
                break;
            case 'copy':
                Clipboard.setString(selectedMessage.message || '');
                break;
            case 'forward':
                setForwardText(selectedMessage.message || '');
                setForwardModalVisible(true);
                break;
            case 'edit':
                setEditingMessage(selectedMessage);
                setReplyingTo(null);
                break;
            case 'delete':
                Alert.alert(
                    "Delete Message",
                    "Are you sure you want to delete this message for everyone?",
                    [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete", style: "destructive", onPress: () => handleDeleteMessage(selectedMessage.id) }
                    ]
                );
                break;
        }
    };

    const handleForwardSubmit = (friendIds: string[]) => {
        handleForwardMessage(forwardText, friendIds);
        Alert.alert("Success", "Message forwarded");
    };

    const handleImagePress = (uri: string) => {
        setViewerImage(uri);
        setViewerVisible(true);
    };

    const formatLastSeen = (timestamp: string) => {
        if (!timestamp) return 'offline';
        const date = new Date(timestamp);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (diffInDays === 0 && now.getDate() === date.getDate()) {
            return `last seen today at ${timeStr}`;
        } else if (diffInDays === 1 || (diffInDays === 0 && now.getDate() !== date.getDate())) {
            return `last seen yesterday at ${timeStr}`;
        } else {
            return `last seen ${date.toLocaleDateString()}`;
        }
    };

    const headerHeight = useHeaderHeight();

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', (e) => {
            setKeyboardOffset(e.endCoordinates.height);
        });
        const hide = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardOffset(0);
        });
        return () => { show.remove(); hide.remove(); };
    }, []);

    if (!currentUser || (loading && messages.length === 0)) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
                <ActivityIndicator size="large" color="#F68537" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#EBD8B7' }}>
            <StatusBar barStyle="dark-content" />
            <Stack.Screen
                options={{
                    headerTitle: '',
                    headerStyle: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    },
                    headerShadowVisible: true,
                    headerLeft: () => (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 8 }}>
                            <TouchableOpacity onPress={() => { Haptics.selectionAsync(); router.back(); }}>
                                <Ionicons name="chevron-back" size={28} color="#F68537" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleViewProfile}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                            >
                                <Image
                                    source={{ uri: friendImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(friendName)}&backgroundColor=F68537` }}
                                    style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#F68537' }}
                                    contentFit="cover"
                                    transition={200}
                                />
                                <View>
                                    <Text style={{ fontWeight: '900', color: '#F68537', fontSize: 16, letterSpacing: -0.5 }}>{friendName}</Text>
                                    <Text style={{
                                        fontSize: 10,
                                        color: isTyping ? '#10B981' : (isUserOnline(friendId as string) ? '#10B981' : '#94A3B8'),
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5
                                    }}>
                                        {isTyping ? 'typing...' : (isUserOnline(friendId as string) ? 'online' : formatLastSeen(friendData?.lastSeen))}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    ),
                    headerRight: () => (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 8 }}>
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    handleStartCall({ id: friendId, name: friendName }, 'audio');
                                }}
                                style={{ backgroundColor: '#F68537', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Ionicons name="call" size={18} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    handleStartCall({ id: friendId, name: friendName }, 'video');
                                }}
                                style={{ backgroundColor: '#F68537', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Ionicons name="videocam" size={18} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setMenuVisible(!menuVisible);
                                }}
                                style={{ padding: 4 }}
                            >
                                <Ionicons name="ellipsis-vertical" size={24} color="#F68537" />
                            </TouchableOpacity>
                            <ChatMenu
                                visible={menuVisible}
                                onClose={() => setMenuVisible(false)}
                                onViewProfile={handleViewProfile}
                                onClearChat={handleClearChat}
                                onBlockUser={handleBlockToggle}
                                isBlocked={isBlocked}
                                isMember={isMember}
                                isGroup={isGroup === 'true'}
                                onLeaveGroup={async () => {
                                    if (!currentUser) return;
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                    Alert.alert(
                                        "Leave Group",
                                        "Are you sure you want to leave this group?",
                                        [
                                            { text: "Cancel", style: "cancel" },
                                            {
                                                text: "Leave",
                                                style: "destructive",
                                                onPress: async () => {
                                                    const success = await useFriendsStore.getState().leaveGroup(currentUser.id, friendId as string);
                                                    if (success) {
                                                        setMenuVisible(false);
                                                        router.back();
                                                    }
                                                }
                                            }
                                        ]
                                    );
                                }}
                            />
                        </View>
                    ),
                }}
            />

            <CallScreen
                visible={!!callSession}
                callState={callSession?.status}
                onEndCall={endCall}
                onAcceptCall={setCallActive}
                currentUser={currentUser}
                callType={callSession?.type || 'video'}
                friend={callSession?.friend || {}}
                offer={callSession?.offer}
            />

            <View style={{ flex: 1, backgroundColor: '#EBD8B7' }}>
                <View style={{ flex: 1 }}>
                    <MessageList
                        messages={messages}
                        currentUser={currentUser}
                        onReply={(msg) => setReplyingTo(msg)}
                        friendName={friendName}
                        onLongPress={handleLongPress}
                        onImagePress={handleImagePress}
                        flyingEmoji={flyingEmoji}
                        onLoadMore={handleLoadMore}
                        loadingMore={loadingMore}
                    />

                    {isTyping && (
                        <View style={styles.typingIndicatorContainer}>
                            <View style={styles.typingBubble}>
                                <View style={styles.dotsContainer}>
                                    <View style={styles.dot} />
                                    <View style={[styles.dot, { opacity: 0.6 }]} />
                                    <View style={[styles.dot, { opacity: 0.3 }]} />
                                </View>
                                <Text style={styles.typingText}>{friendName} is typing...</Text>
                            </View>
                        </View>
                    )}
                </View>

                <ChatInput
                    onSendMessage={onSendMessage}
                    onTyping={handleTypingStatus}
                    replyingTo={replyingTo}
                    onCancelReply={() => setReplyingTo(null)}
                    editingMessage={editingMessage}
                    onCancelEdit={() => setEditingMessage(null)}
                    onSaveEdit={onSaveEdit}
                    isMember={isMember}
                />
                <View style={{ height: keyboardOffset > 0 ? keyboardOffset + 40 : 0 }} />
            </View>

            <MessageContextMenu
                visible={contextMenuVisible}
                onClose={() => setContextMenuVisible(false)}
                onSelectReaction={(emoji) => selectedMessage && handleReact(selectedMessage.id, emoji)}
                onAction={handleMessageAction}
                anchorY={anchorY}
                isCurrentUser={selectedMessage?.sender_id === currentUser?.id}
                canEdit={selectedMessage?.sender_id === currentUser?.id}
            />

            <ForwardMessageModal
                visible={forwardModalVisible}
                onClose={() => setForwardModalVisible(false)}
                onForward={handleForwardSubmit}
                messageText={forwardText}
            />

            <MediaViewer
                visible={viewerVisible}
                onClose={() => setViewerVisible(false)}
                imageUri={viewerImage}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    typingIndicatorContainer: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        position: 'absolute',
        bottom: 0,
        left: 0,
    },
    typingBubble: {
        backgroundColor: '#E8F9F1',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderBottomLeftRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        maxWidth: '80%',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: 3,
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#10B981',
    },
    typingText: {
        fontSize: 13,
        color: '#10B981',
        fontWeight: '600',
        fontStyle: 'italic',
    }
});
