import React, { useState, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform, SafeAreaView, Text, TouchableOpacity, ActivityIndicator, Alert, Clipboard } from 'react-native';
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

export default function ChatScreen() {
    const { id: friendId, name: friendName, isGroup } = useLocalSearchParams<{ id: string, name: string, isGroup?: string }>();
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);
        };
        getUser();
    }, []);

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
    } = useChatRoom(friendId as string, currentUser, isGroup === 'true');

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

    if (!currentUser) return <ActivityIndicator className="flex-1" color="#F68537" style={{ marginTop: 100 }} />;

    return (
        <SafeAreaView className="flex-1 bg-[#F8FAFC]">
            <Stack.Screen
                options={{
                    headerTitle: () => (
                        <View>
                            <Text className="font-bold text-gray-800 text-[16px]">{friendName}</Text>
                            {isTyping && <Text className="text-[10px] text-[#F68537] font-medium italic">typing...</Text>}
                        </View>
                    ),
                    headerRight: () => (
                        <View className="flex-row items-center gap-4 mr-1">
                            <TouchableOpacity onPress={() => { }} className="p-1">
                                <Ionicons name="call-outline" size={22} color="#F68537" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { }} className="p-1">
                                <Ionicons name="videocam-outline" size={24} color="#F68537" />
                            </TouchableOpacity>
                            <View>
                                <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)} className="p-1">
                                    <Ionicons name="ellipsis-vertical" size={22} color="#94A3B8" />
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
                        </View>
                    ),
                }}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <MessageList
                    messages={messages}
                    currentUser={currentUser}
                    onReply={(msg) => setReplyingTo(msg)}
                    friendName={friendName}
                    onLongPress={handleLongPress}
                    onImagePress={handleImagePress}
                />

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
        </SafeAreaView>
    );
}
