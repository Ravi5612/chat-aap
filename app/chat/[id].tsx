import React, { useState, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform, Text, TouchableOpacity, ActivityIndicator, Alert, Clipboard, Image, Keyboard, StatusBar } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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

export default function ChatScreen() {
    const params = useLocalSearchParams<{ id: string, name: string, isGroup?: string, image?: string }>();
    const { id: friendId, name: friendName, isGroup, image: friendImage } = params;
    const router = useRouter();
    const { user: currentUser } = useAuthStore();
    const { blockedUserIds, blockUser, unblockUser } = useFriendsStore();
    const isBlocked = blockedUserIds.includes(friendId as string);

    const chatRoom = useChatRoom(friendId as string, currentUser, isGroup === 'true');
    const { isUserOnline } = usePresence(currentUser?.id);

    const {
        messages,
        loading,
        isTyping,
        handleSendMessage,
        handleTypingStatus,
        handleReact,
        handleSaveEdit,
        handleDeleteMessage,
        handleForwardMessage,
        flyingEmoji
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

    const headerHeight = useHeaderHeight();
    const keyboardOffset = Platform.OS === 'ios' ? headerHeight : headerHeight + (StatusBar.currentHeight || 0);

    if (!currentUser || (loading && messages.length === 0)) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
                <ActivityIndicator size="large" color="#F68537" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            <StatusBar barStyle="dark-content" />
            <Stack.Screen
                options={{
                    headerStyle: { backgroundColor: '#F8FAFC' },
                    headerShadowVisible: false,
                    headerTitle: () => (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <TouchableOpacity
                                onPress={handleViewProfile}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                            >
                                <Image
                                    source={{ uri: friendImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(friendName)}&backgroundColor=F68537` }}
                                    style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#F1F5F9' }}
                                />
                                <View>
                                    <Text style={{ fontWeight: 'bold', color: '#1F2937', fontSize: 16 }}>{friendName}</Text>
                                    <Text style={{
                                        fontSize: 10,
                                        color: isTyping ? '#F68537' : (isUserOnline(friendId as string) ? '#10B981' : '#94A3B8'),
                                        fontWeight: '600'
                                    }}>
                                        {isTyping ? 'typing...' : (isUserOnline(friendId as string) ? 'online' : 'offline')}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    ),
                    headerRight: () => (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 8 }}>
                            <TouchableOpacity
                                onPress={() => handleStartCall({ id: friendId, name: friendName }, 'audio')}
                                style={{ padding: 8 }}
                            >
                                <Ionicons name="call-outline" size={20} color="#F68537" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleStartCall({ id: friendId, name: friendName }, 'video')}
                                style={{ padding: 8 }}
                            >
                                <Ionicons name="videocam-outline" size={22} color="#F68537" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)} style={{ padding: 8 }}>
                                <Ionicons name="ellipsis-vertical" size={20} color="#94A3B8" />
                            </TouchableOpacity>
                            <ChatMenu
                                visible={menuVisible}
                                onClose={() => setMenuVisible(false)}
                                onViewProfile={handleViewProfile}
                                onClearChat={handleClearChat}
                                onBlockUser={handleBlockToggle}
                                isBlocked={isBlocked}
                                isGroup={isGroup === 'true'}
                                onLeaveGroup={async () => {
                                    if (!currentUser) return;
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

            {Platform.OS === 'ios' ? (
                <KeyboardAvoidingView
                    behavior="padding"
                    style={{ flex: 1, backgroundColor: '#EBD8B7' }}
                    keyboardVerticalOffset={headerHeight}
                >
                    <View style={{ flex: 1 }}>
                        <MessageList
                            messages={messages}
                            currentUser={currentUser}
                            onReply={(msg) => setReplyingTo(msg)}
                            friendName={friendName}
                            onLongPress={handleLongPress}
                            onImagePress={handleImagePress}
                            flyingEmoji={flyingEmoji}
                        />
                    </View>

                    <ChatInput
                        onSendMessage={onSendMessage}
                        onTyping={handleTypingStatus}
                        replyingTo={replyingTo}
                        onCancelReply={() => setReplyingTo(null)}
                        editingMessage={editingMessage}
                        onCancelEdit={() => setEditingMessage(null)}
                        onSaveEdit={onSaveEdit}
                    />
                </KeyboardAvoidingView>
            ) : (
                <KeyboardAvoidingView
                    behavior="padding"
                    style={{ flex: 1, backgroundColor: '#EBD8B7' }}
                    keyboardVerticalOffset={70}
                >
                    <View style={{ flex: 1 }}>
                        <MessageList
                            messages={messages}
                            currentUser={currentUser}
                            onReply={(msg) => setReplyingTo(msg)}
                            friendName={friendName}
                            onLongPress={handleLongPress}
                            onImagePress={handleImagePress}
                            flyingEmoji={flyingEmoji}
                        />
                    </View>

                    <ChatInput
                        onSendMessage={onSendMessage}
                        onTyping={handleTypingStatus}
                        replyingTo={replyingTo}
                        onCancelReply={() => setReplyingTo(null)}
                        editingMessage={editingMessage}
                        onCancelEdit={() => setEditingMessage(null)}
                        onSaveEdit={onSaveEdit}
                    />
                </KeyboardAvoidingView>
            )}

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
