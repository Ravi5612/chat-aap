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

export default function ChatScreen() {
    const params = useLocalSearchParams<{ id: string, name: string, isGroup?: string, image?: string }>();
    const { id: friendId, name: friendName, isGroup, image: friendImage } = params;
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const showSubscription = Keyboard.addListener('keyboardDidShow', (e: any) => {
            console.log('Keyboard SHOWN. Height:', e.endCoordinates.height);
        });
        const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
            console.log('Keyboard HIDDEN');
        });

        const getUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setCurrentUser(user);
            } catch (err) {
                console.error('ChatScreen: Auth error:', err);
            }
        };
        getUser();

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    const chatRoom = useChatRoom(friendId as string, currentUser, isGroup === 'true');
    const {
        messages,
        loading,
        isTyping,
        handleSendMessage,
        handleTypingStatus,
        handleReact,
        handleSaveEdit,
        handleDeleteMessage,
        handleForwardMessage
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

    console.log('ChatScreen: Layout Metrics:', {
        headerHeight,
        statusBarHeight: StatusBar.currentHeight,
        keyboardOffset
    });

    if (!currentUser || (loading && messages.length === 0)) {
        return (
            <View className="flex-1 items-center justify-center bg-[#F8FAFC]">
                <ActivityIndicator size="large" color="#F68537" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#F8FAFC]">
            <Stack.Screen
                options={{
                    headerStyle: { backgroundColor: '#F8FAFC' },
                    headerShadowVisible: false,
                    headerTitle: () => (
                        <View className="flex-row items-center gap-2">
                            <Image
                                source={{ uri: friendImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(friendName)}&backgroundColor=F68537` }}
                                className="w-10 h-10 rounded-full border border-gray-100"
                            />
                            <View>
                                <Text className="font-bold text-gray-800 text-[16px]">{friendName}</Text>
                                <Text className="text-[10px] text-green-500 font-medium">{isTyping ? 'typing...' : 'online'}</Text>
                            </View>
                        </View>
                    ),
                    headerRight: () => (
                        <View className="flex-row items-center gap-3 mr-2">
                            <TouchableOpacity
                                onPress={() => handleStartCall({ id: friendId, name: friendName }, 'audio')}
                                className="p-2"
                            >
                                <Ionicons name="call-outline" size={20} color="#F68537" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleStartCall({ id: friendId, name: friendName }, 'video')}
                                className="p-2"
                            >
                                <Ionicons name="videocam-outline" size={22} color="#F68537" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)} className="p-2">
                                <Ionicons name="ellipsis-vertical" size={20} color="#94A3B8" />
                            </TouchableOpacity>
                            <ChatMenu
                                visible={menuVisible}
                                onClose={() => setMenuVisible(false)}
                                onViewProfile={() => { }}
                                onClearChat={handleClearChat}
                                onBlockUser={() => { }}
                                isBlocked={false}
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
                    className="flex-1 bg-[#EBD8B7]"
                    keyboardVerticalOffset={headerHeight}
                >
                    <View className="flex-1">
                        <MessageList
                            messages={messages}
                            currentUser={currentUser}
                            onReply={(msg) => setReplyingTo(msg)}
                            friendName={friendName}
                            onLongPress={handleLongPress}
                            onImagePress={handleImagePress}
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
                    className="flex-1 bg-[#EBD8B7]"
                    keyboardVerticalOffset={70}
                >
                    <View className="flex-1">
                        <MessageList
                            messages={messages}
                            currentUser={currentUser}
                            onReply={(msg) => setReplyingTo(msg)}
                            friendName={friendName}
                            onLongPress={handleLongPress}
                            onImagePress={handleImagePress}
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
