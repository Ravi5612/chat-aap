import React, { useState, useEffect, useMemo } from 'react';
import { View, KeyboardAvoidingView, Platform, Text, Alert, Clipboard, Keyboard, StatusBar, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

import MessageList from '@/components/chat/MessageList';
import ChatInput from '@/components/chat/ChatInput';
import { useChatRoom } from '@/hooks/useChatRoom';
import { useCallManager } from '@/hooks/useCallManager';
import { useAuthStore } from '@/store/useAuthStore';

// Custom Hooks
import { useChatSync } from '@/hooks/useChatSync';
import { useChatActions } from '@/hooks/useChatActions';
import { useChatStatus } from '@/hooks/useChatStatus';

// Subcomponents
import ChatHeader from '@/components/chat/ChatHeader';
import ChatSkeleton from '@/components/chat/ChatSkeleton';
import ChatModals from '@/components/chat/ChatModals';
import { UnfriendedBanner, BlockedBanner } from '@/components/chat/ChatBanners';

export default function ChatScreen() {
    const params = useLocalSearchParams<{ id: string, name: string, isGroup?: string, image?: string }>();
    const insets = useSafeAreaInsets();
    const hasMeasured = insets.top > 0 || insets.bottom > 0;
    const safeTop = hasMeasured ? insets.top : (initialWindowMetrics?.insets?.top || StatusBar.currentHeight || 44);
    const safeBottom = hasMeasured ? insets.bottom : (initialWindowMetrics?.insets?.bottom || 0);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    
    const router = useRouter();
    const { id: friendId, name: friendName, isGroup, image: friendImage } = params;
    const safeFriendId = (friendId as string) || '';
    const currentUser = useAuthStore(state => state.user);
    
    const { isBlocked, iAmBlocked, isFriend, isUserOnline, friendData } = useChatStatus(currentUser, safeFriendId, isGroup === 'true');
    const chatRoom = useChatRoom(safeFriendId, currentUser, isGroup === 'true');
    
    const roomId = useMemo(() => {
        if (isGroup === 'true') return safeFriendId;
        if (!currentUser?.id || !safeFriendId) return '';
        const ids = [currentUser.id, safeFriendId].sort();
        return `${ids[0]}_${ids[1]}`;
    }, [currentUser?.id, safeFriendId, isGroup]);
    
    const {
        messages, loading, loadingMore, isTyping, handleSendMessage: handleSendMessageOriginal,
        handleTypingStatus, handleReact, handleSaveEdit, handleDeleteMessage, handleForwardMessage,
        flyingEmoji, isMember, handleLoadMore
    } = chatRoom;

    const { handleStartCall } = useCallManager(currentUser, [], false);

    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [editingMessage, setEditingMessage] = useState<any>(null);
    
    // Modal states
    const [contextMenuVisible, setContextMenuVisible] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<any>(null);
    const [anchorY, setAnchorY] = useState(0);
    const [forwardModalVisible, setForwardModalVisible] = useState(false);
    const [forwardText, setForwardText] = useState('');
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerImage, setViewerImage] = useState<string | null>(null);
    const [ledgerVisible, setLedgerVisible] = useState(false);
    const [infoVisible, setInfoVisible] = useState(false);

    const handleMessageLongPress = useCallback((msg: any, y: number) => {
        setSelectedMessage(msg);
        setAnchorY(y);
        setContextMenuVisible(true);
    }, []);

    const handleImagePress = useCallback((uri: string) => {
        setViewerImage(uri);
        setViewerVisible(true);
    }, []);

    const { wallpaper, setWallpaper, draft, handleDraftChange } = useChatSync(roomId, safeFriendId, currentUser, isGroup === 'true', messages);
    const { handleClearChat, handleBlockToggle, handleUnfriend, handleSetWallpaper } = useChatActions(currentUser, safeFriendId, roomId, friendName as string, isGroup === 'true', isBlocked, setWallpaper);

    const handleSendMessage = async (text: string) => {
        if (!text.trim() || !currentUser) return;
        if (isBlocked) return Alert.alert("Blocked", "Unblock this user to send messages.");
        if (iAmBlocked) return Alert.alert("Blocked", "You are blocked by this user.");

        const replyId = replyingTo?.id;
        setReplyingTo(null);
        handleDraftChange('');

        try { await handleSendMessageOriginal(text, replyId); } 
        catch (error) { console.error('[CHAT] Send failed:', error); }
    };

    const onSaveEdit = (text: string) => {
        if (editingMessage) {
            handleSaveEdit(editingMessage.id, text);
            setEditingMessage(null);
        }
    };

    const handleMessageAction = (action: string) => {
        if (!selectedMessage) return;
        switch (action) {
            case 'reply': setReplyingTo(selectedMessage); setEditingMessage(null); break;
            case 'copy': Clipboard.setString(selectedMessage.message || ''); break;
            case 'forward': setForwardText(selectedMessage.message || ''); setForwardModalVisible(true); break;
            case 'info': setInfoVisible(true); break;
            case 'edit': setEditingMessage(selectedMessage); setReplyingTo(null); break;
            case 'delete': 
                Alert.alert("Delete Message", "Choose how you want to delete this message.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete for Me", onPress: () => handleDeleteMessage(selectedMessage.id, false) },
                    { text: "Delete for Everyone", style: "destructive", onPress: () => handleDeleteMessage(selectedMessage.id, true) }
                ]); 
                break;
        }
    };

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const sub1 = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
        const sub2 = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
        return () => { sub1.remove(); sub2.remove(); };
    }, []);

    if (!currentUser || (loading && messages.length === 0)) {
        return <ChatSkeleton safeTop={safeTop} safeBottom={safeBottom} />;
    }

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            style={{ flex: 1, backgroundColor: wallpaper ? '#000' : '#EBD8B7' }}
        >
            {wallpaper && <Image source={{ uri: wallpaper }} style={StyleSheet.absoluteFillObject} contentFit="cover" priority="high" />}
            {wallpaper && <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />}
            <StatusBar barStyle="dark-content" />
            <Stack.Screen options={{ headerShown: false }} />

            <ChatHeader
                safeTop={safeTop}
                friendId={safeFriendId}
                friendName={friendName as string}
                friendImage={friendImage as string}
                isGroup={isGroup === 'true'}
                isTyping={isTyping || !!friendData?.isTyping}
                isUserOnline={isUserOnline}
                lastSeen={friendData?.lastSeen}
                isFriend={isFriend}
                isBlocked={isBlocked}
                iAmBlocked={iAmBlocked}
                isMember={isMember}
                currentUserId={currentUser.id}
                handleStartCall={handleStartCall}
                handleViewProfile={() => router.push(`/profile/${friendId}` as any)}
                handleClearChat={handleClearChat}
                handleBlockToggle={handleBlockToggle}
                handleUnfriend={handleUnfriend}
                handleSetWallpaper={handleSetWallpaper}
                setLedgerVisible={setLedgerVisible}
            />

            <View style={{ flex: 1 }}>
                <MessageList
                    messages={messages}
                    currentUser={currentUser}
                    onReply={setReplyingTo}
                    friendName={friendName as string}
                    onLongPress={handleMessageLongPress}
                    onImagePress={handleImagePress}
                    flyingEmoji={flyingEmoji}
                    onLoadMore={handleLoadMore}
                    loadingMore={loadingMore}
                />
                
                {isTyping && (
                    <View style={styles.typingIndicatorContainer}>
                        <View style={styles.typingBubble}>
                            <Text style={styles.typingText}>{friendName} is typing...</Text>
                        </View>
                    </View>
                )}

                {isFriend === false && isGroup !== 'true' && (
                    <UnfriendedBanner safeFriendId={safeFriendId} onAddFriend={() => router.push(`/profile/${safeFriendId}` as any)} />
                )}

                {!isBlocked && !iAmBlocked && isFriend !== false && (
                    <ChatInput
                        onSendMessage={handleSendMessage}
                        onTyping={handleTypingStatus}
                        replyingTo={replyingTo}
                        onCancelReply={() => setReplyingTo(null)}
                        editingMessage={editingMessage}
                        onCancelEdit={() => setEditingMessage(null)}
                        onSaveEdit={onSaveEdit}
                        isMember={isMember}
                        isKeyboardOpen={keyboardVisible}
                        initialMessage={draft}
                        onDraftChange={handleDraftChange}
                    />
                )}

                {(isBlocked || iAmBlocked) && (
                    <BlockedBanner isBlocked={isBlocked} friendName={friendName as string} onUnblock={handleBlockToggle} />
                )}
            </View>

            <ChatModals
                contextMenuVisible={contextMenuVisible}
                setContextMenuVisible={setContextMenuVisible}
                selectedMessage={selectedMessage}
                anchorY={anchorY}
                currentUser={currentUser}
                handleReact={handleReact}
                handleMessageAction={handleMessageAction}
                forwardModalVisible={forwardModalVisible}
                setForwardModalVisible={setForwardModalVisible}
                handleForwardSubmit={(ids) => { handleForwardMessage(forwardText, ids); Alert.alert("Success", "Message forwarded"); }}
                viewerVisible={viewerVisible}
                setViewerVisible={setViewerVisible}
                viewerImage={viewerImage}
                ledgerVisible={ledgerVisible}
                setLedgerVisible={setLedgerVisible}
                safeFriendId={safeFriendId}
                friendName={friendName as string}
                infoVisible={infoVisible}
                setInfoVisible={setInfoVisible}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    typingIndicatorContainer: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        alignItems: 'flex-start'
    },
    typingBubble: {
        backgroundColor: 'rgba(255,255,255,0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderBottomLeftRadius: 4,
    },
    typingText: {
        fontSize: 12,
        color: '#F68537',
        fontStyle: 'italic',
        fontWeight: 'bold'
    }
});
