import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, KeyboardAvoidingView, Platform, Text, Alert, Clipboard, Keyboard, StatusBar, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';

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

// Subcomponents
import ChatHeader from '@/components/chat/ChatHeader';
import ChatSkeleton from '@/components/chat/ChatSkeleton';
import ChatModals from '@/components/chat/ChatModals';
import { UnfriendedBanner, BlockedBanner } from '@/components/chat/ChatBanners';
import DisappearingMessagesModal from '@/components/chat/DisappearingMessagesModal';
import ScheduledMessagesListModal from '@/components/chat/ScheduledMessagesListModal';
import { translateMessage } from '@/services/translationService';
import * as Speech from 'expo-speech';

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
    const [viewerIsVideo, setViewerIsVideo] = useState(false);
    const [ledgerVisible, setLedgerVisible] = useState(false);
    const [infoVisible, setInfoVisible] = useState(false);
    const [disappearingModalVisible, setDisappearingModalVisible] = useState(false);
    const [scheduledListModalVisible, setScheduledListModalVisible] = useState(false);
    const [translatedMessages, setTranslatedMessages] = useState<Record<string, { text: string; lang: string }>>({});
    const [autoListenMode, setAutoListenMode] = useState(false);
    
    const disappearingDuration = friendData?.disappearing_duration || 0;

    const handleSetDisappearingDuration = async (duration: number) => {
        if (!currentUser?.id || !safeFriendId) return;
        try {
            await supabase.from('friendships').update({ disappearing_duration: duration })
                .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${safeFriendId}),and(user_id.eq.${safeFriendId},friend_id.eq.${currentUser.id})`);
            
            const infoText = duration === 0 
                ? `${currentUser.user_metadata?.username || 'User'} turned off disappearing messages.`
                : `${currentUser.user_metadata?.username || 'User'} set disappearing messages to ${duration === 86400 ? '24 Hours' : (duration === 604800 ? '7 Days' : '30 Days')}.`;
            
            await handleSendMessageOriginal(infoText, undefined, undefined, 'info');
        } catch (error) {
            console.error('Failed to set disappearing duration', error);
        }
    };

    const handleMessageLongPress = useCallback((msg: any, y: number) => {
        setSelectedMessage(msg);
        setAnchorY(y);
        setContextMenuVisible(true);
    }, []);

    const handleImagePress = useCallback((uri: string, isVideo: boolean = false) => {
        setViewerImage(uri);
        setViewerIsVideo(isVideo);
        setViewerVisible(true);
    }, []);

    const { wallpaper, setWallpaper, draft, handleDraftChange } = useChatSync(roomId, safeFriendId, currentUser, isGroup === 'true', messages);
    const { handleClearChat, handleBlockToggle, handleUnfriend, handleSetWallpaper } = useChatActions(currentUser, safeFriendId, roomId, friendName as string, isGroup === 'true', isBlocked, setWallpaper);

    const handleSendMessage = async (text: string, scheduledAt?: Date) => {
        if (!text.trim() || !currentUser) return;
        if (isBlocked) return Alert.alert("Blocked", "Unblock this user to send messages.");
        if (iAmBlocked) return Alert.alert("Blocked", "You are blocked by this user.");

        const replyId = replyingTo?.id;
        setReplyingTo(null);
        handleDraftChange('');

        try { await handleSendMessageOriginal(text, replyId, disappearingDuration, undefined, scheduledAt); } 
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
            case 'translate': {
                const msgId = selectedMessage.id;
                // Toggle: agar already translated hai toh hide karo
                if (translatedMessages[msgId]) {
                    setTranslatedMessages(prev => { const n = { ...prev }; delete n[msgId]; return n; });
                    return;
                }
                const rawText = selectedMessage.message || '';
                translateMessage(rawText).then(result => {
                    if (result) {
                        setTranslatedMessages(prev => ({
                            ...prev,
                            [msgId]: { text: result.translatedText, lang: result.detectedLang }
                        }));
                    } else {
                        Alert.alert('Translation Failed', 'Could not translate this message. Please try again.');
                    }
                });
                break;
            }
            case 'listen': {
                const textToSpeak = selectedMessage.message || '';
                // Clean up special tags like [Image], [Voice Message] etc.
                const cleanText = textToSpeak
                    .replace(/\[Image\]\s*\S+/g, 'Image')
                    .replace(/\[Video\]\s*\S+/g, 'Video')
                    .replace(/\[Voice Message\]\s*\S+/g, 'Voice Message')
                    .replace(/\[Document\][^|]+\|?[^|]*/g, 'Document')
                    .replace(/\[Contact\][^|]+\|?[^|]*/g, 'Contact')
                    .replace(/\[Location\][^|]+\|?[^|]*/g, 'Location')
                    .trim();

                if (!cleanText) {
                    Alert.alert('Nothing to read', 'This message has no text to speak.');
                    break;
                }

                // Detect language - Hindi characters range
                const isHindi = /[\u0900-\u097F]/.test(cleanText);
                const lang = isHindi ? 'hi-IN' : 'en-US';

                // Stop if already speaking, else start
                Speech.isSpeakingAsync().then(isSpeaking => {
                    if (isSpeaking) {
                        Speech.stop();
                    } else {
                        Speech.speak(cleanText, {
                            language: lang,
                            pitch: 1.0,
                            rate: 0.9,
                        });
                    }
                });
                break;
            }
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

    // Screenshot Prevention Logic
    useEffect(() => {
        let isActive = false;
        
        const manageScreenshot = async () => {
            try {
                // By default, allow screenshots unless explicitly disabled by friend
                // Note: group chats might not have this, so we default to true if friendData is missing
                const allowScreenshot = friendData?.friend?.allow_screenshot ?? true;
                
                if (!allowScreenshot && isGroup !== 'true') {
                    console.log('[DEBUG] Preventing screen capture for this chat because friend disabled it.');
                    await ScreenCapture.preventScreenCaptureAsync();
                    isActive = true;
                } else {
                    console.log('[DEBUG] Screen capture is allowed for this chat.');
                    await ScreenCapture.allowScreenCaptureAsync();
                    isActive = false;
                }
            } catch (error) {
                console.error('[CHAT] Screen capture logic failed:', error);
            }
        };

        manageScreenshot();

        return () => {
            // Restore screen capture when leaving this chat
            if (isActive) {
                console.log('[DEBUG] Restoring screen capture on unmount.');
                ScreenCapture.allowScreenCaptureAsync().catch(err => {
                    console.error('[CHAT] Failed to restore screen capture:', err);
                });
            }
        };
    }, [friendData?.friend?.allow_screenshot, isGroup]);

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
                onSetDisappearingMessages={() => setDisappearingModalVisible(true)}
                onViewScheduledMessages={() => setScheduledListModalVisible(true)}
                disappearingDuration={disappearingDuration}
                autoListenMode={autoListenMode}
                onToggleAutoListen={() => setAutoListenMode(prev => !prev)}
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
                allowDownload={friendData?.friend?.allow_status_download ?? true}
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
