import React, { useState, useEffect, useMemo } from 'react';
import { View, KeyboardAvoidingView, Platform, Alert, Keyboard, StatusBar, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

import MessageList from '@/components/chat/MessageList';
import ChatInput from '@/components/chat/ChatInput';
import { useChatRoom } from '@/hooks/useChatRoom';
import { useCallManager } from '@/hooks/useCallManager';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';

// Custom Hooks
import { useChatSync } from '@/hooks/useChatSync';
import { useChatActions } from '@/hooks/useChatActions';
import { useChatStatus } from '@/hooks/useChatStatus';
import { useScreenshotPrevention } from '@/hooks/chatRoom/useScreenshotPrevention';
import { useMessageTools } from '@/hooks/chatRoom/useMessageTools';
import { useDisappearingMessages } from '@/hooks/chatRoom/useDisappearingMessages';
import { useMessageContextMenu } from '@/hooks/chatRoom/useMessageContextMenu';

// Subcomponents
import ChatHeader from '@/components/chat/ChatHeader';
import ChatSkeleton from '@/components/chat/ChatSkeleton';
import ChatModals from '@/components/chat/ChatModals';
import { UnfriendedBanner, BlockedBanner } from '@/components/chat/ChatBanners';
import DisappearingMessagesModal from '@/components/chat/DisappearingMessagesModal';
import ScheduledMessagesListModal from '@/components/chat/ScheduledMessagesListModal';
import { TypingIndicator } from '@/components/chat/TypingIndicator';

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

    // chatKey for encryption - used in ScheduledMessagesListModal
    const chatKey = useChatStore(state => state.chatKey);

    const { handleStartCall } = useCallManager(currentUser, [], false);
    
    // Extracted Modals/Tools Logic
    const { translatedMessages, autoListenMode, toggleAutoListen, handleTranslate, handleListen } = useMessageTools();
    const { disappearingDuration, disappearingModalVisible, setDisappearingModalVisible, handleSetDisappearingDuration } = useDisappearingMessages(currentUser, safeFriendId, friendData, handleSendMessageOriginal);
    const {
        contextMenuVisible, setContextMenuVisible, selectedMessage, anchorY,
        replyingTo, setReplyingTo, editingMessage, setEditingMessage,
        forwardModalVisible, setForwardModalVisible, forwardText,
        infoVisible, setInfoVisible, handleMessageLongPress, handleMessageAction
    } = useMessageContextMenu(handleDeleteMessage, handleTranslate, handleListen);

    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerImage, setViewerImage] = useState<string | null>(null);
    const [viewerIsVideo, setViewerIsVideo] = useState(false);
    const [ledgerVisible, setLedgerVisible] = useState(false);
    const [scheduledListModalVisible, setScheduledListModalVisible] = useState(false);

    const handleImagePress = (uri: string, isVideo: boolean = false) => {
        setViewerImage(uri);
        setViewerIsVideo(isVideo);
        setViewerVisible(true);
    };

    const { wallpaper, setWallpaper, draft, handleDraftChange } = useChatSync(roomId, safeFriendId, currentUser, isGroup === 'true', messages);
    const { handleClearChat, handleBlockToggle, handleUnfriend, handleSetWallpaper } = useChatActions(currentUser, safeFriendId, roomId, friendName as string, isGroup === 'true', isBlocked, setWallpaper);

    const handleSendMessage = async (text: string, scheduledAt?: Date) => {
        if (!text.trim() || !currentUser) return;
        if (isBlocked) return Alert.alert("Blocked", "Unblock this user to send messages.");
        if (iAmBlocked) return Alert.alert("Blocked", "You are blocked by this user.");

        const replyId = replyingTo?.id;
        const oldDraft = draft;
        handleDraftChange('');

        try { 
            await handleSendMessageOriginal(text, replyId, disappearingDuration, undefined, scheduledAt); 
            setReplyingTo(null);
        } 
        catch (error) { 
            console.error('[CHAT] Send failed:', error); 
            handleDraftChange(oldDraft);
        }
    };

    const onSaveEdit = (text: string) => {
        if (editingMessage) {
            handleSaveEdit(editingMessage.id, text);
            setEditingMessage(null);
        }
    };

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const sub1 = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
        const sub2 = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
        return () => { sub1.remove(); sub2.remove(); };
    }, []);

    useScreenshotPrevention(friendData, isGroup === 'true');

    if (!currentUser || (loading && messages.length === 0)) {
        return <ChatSkeleton safeTop={safeTop} safeBottom={safeBottom} />;
    }

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            style={{ flex: 1, backgroundColor: wallpaper ? '#000' : '#EBD8B7' }}
            enabled={Platform.OS === 'ios'}
        >
            {wallpaper && <Image source={{ uri: wallpaper }} style={StyleSheet.absoluteFillObject} contentFit="cover" priority="high"  cachePolicy="memory" />}
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
                onSetDisappearingMessages={() => setDisappearingModalVisible(true)}
                onViewScheduledMessages={() => setScheduledListModalVisible(true)}
                disappearingDuration={disappearingDuration}
                autoListenMode={autoListenMode}
                onToggleAutoListen={toggleAutoListen}
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
                    translatedMessages={translatedMessages}
                    autoListenMode={autoListenMode}
                />
                
                {isTyping && <TypingIndicator friendName={friendName as string} />}

                {isFriend === false && isGroup !== 'true' && (
                    <UnfriendedBanner safeFriendId={safeFriendId} onAddFriend={() => router.push(`/profile/${safeFriendId}` as any)} />
                )}

                {!isBlocked && !iAmBlocked && isFriend !== false && (
                    <ChatInput
                        onSendMessage={(text, scheduledAt) => handleSendMessage(text, scheduledAt)}
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
                viewerIsVideo={viewerIsVideo}
                ledgerVisible={ledgerVisible}
                setLedgerVisible={setLedgerVisible}
                safeFriendId={safeFriendId}
                friendName={friendName as string}
                infoVisible={infoVisible}
                setInfoVisible={setInfoVisible}
            />

            <DisappearingMessagesModal
                visible={disappearingModalVisible}
                onClose={() => setDisappearingModalVisible(false)}
                currentDuration={disappearingDuration}
                onSelectDuration={handleSetDisappearingDuration}
            />

            <ScheduledMessagesListModal
                visible={scheduledListModalVisible}
                onClose={() => setScheduledListModalVisible(false)}
                friendId={safeFriendId}
                isGroup={isGroup === 'true'}
                chatKey={chatKey}
            />
        </KeyboardAvoidingView>
    );
}

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
