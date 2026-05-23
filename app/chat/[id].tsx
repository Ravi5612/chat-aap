import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, KeyboardAvoidingView, Platform, Text, TouchableOpacity, ActivityIndicator, Alert, Clipboard, Keyboard, StatusBar, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MessageList from '@/components/chat/MessageList';
import ChatInput from '@/components/chat/ChatInput';
import { supabase } from '@/lib/supabase';
import { useChatRoom } from '@/hooks/useChatRoom';
import MessageContextMenu from '@/components/chat/MessageContextMenu';
import ForwardMessageModal from '@/components/chat/ForwardMessageModal';
import MediaViewer from '@/components/chat/MediaViewer';
import CallScreen from '@/components/chat/CallScreen';
import LedgerModal from '@/components/chat/LedgerModal';
import { useCallManager } from '@/hooks/useCallManager';
import { useAuthStore } from '@/store/useAuthStore';
import { useFriendsStore } from '@/store/useFriendsStore';
import { useChatSync } from '@/hooks/useChatSync';
import { useChatActions } from '@/hooks/useChatActions';
import ChatHeader from '@/components/chat/ChatHeader';

function ChatScreen() {
    const params = useLocalSearchParams<{ id: string, name: string, isGroup?: string, image?: string }>();
    const insets = useSafeAreaInsets();
    const hasMeasured = insets.top > 0 || insets.bottom > 0;
    const safeTop = hasMeasured ? insets.top : (initialWindowMetrics?.insets?.top || StatusBar.currentHeight || 44);
    const safeBottom = hasMeasured ? insets.bottom : (initialWindowMetrics?.insets?.bottom || 0);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    
    const { id: friendId, name: friendName, isGroup, image: friendImage } = params;
    const router = useRouter();
    const safeFriendId = (friendId as string) || '';
    const { user: currentUser } = useAuthStore();
    
    const onlineUsers = useFriendsStore(state => state.onlineUsers);
    const combinedItems = useFriendsStore(state => state.combinedItems);
    const blockedUserIds = useFriendsStore(state => state.blockedUserIds);
    const isBlocked = safeFriendId ? blockedUserIds.includes(safeFriendId) : false;
    
    const [iAmBlocked, setIAmBlocked] = useState(false);
    const [isFriend, setIsFriend] = useState<boolean | null>(null);

    const checkBlockStatus = useCallback(async () => {
        if (!currentUser || !safeFriendId || isGroup === 'true') return;
        const { data, error } = await supabase
            .from('blocked_users')
            .select('*')
            .eq('blocker_id', safeFriendId)
            .eq('blocked_id', currentUser.id)
            .maybeSingle();
        setIAmBlocked(!!data && !error);
    }, [currentUser, safeFriendId, isGroup]);

    const checkFriendshipStatus = useCallback(async () => {
        if (!currentUser || !safeFriendId || isGroup === 'true') {
            setIsFriend(true);
            return;
        }
        const { data } = await supabase
            .from('friendships')
            .select('id')
            .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${safeFriendId}),and(user_id.eq.${safeFriendId},friend_id.eq.${currentUser.id})`)
            .limit(1);
        setIsFriend(Array.isArray(data) && data.length > 0);
    }, [currentUser, safeFriendId, isGroup]);

    useEffect(() => {
        checkBlockStatus();
        checkFriendshipStatus();
        const channel = supabase
            .channel(`block-status-${safeFriendId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'blocked_users' }, async () => {
                if (currentUser) await useFriendsStore.getState().fetchBlockedUsers(currentUser.id);
                checkBlockStatus();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
                checkFriendshipStatus();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [safeFriendId, checkBlockStatus, checkFriendshipStatus, currentUser]);

    const friendData = useMemo(() => (combinedItems || []).find(f => f?.id === safeFriendId), [combinedItems, safeFriendId]);
    const chatRoom = useChatRoom(safeFriendId, currentUser, isGroup === 'true');
    
    const roomId = useMemo(() => {
        if (isGroup === 'true') return safeFriendId;
        if (!currentUser?.id || !safeFriendId) return '';
        const ids = [currentUser.id, safeFriendId].sort();
        return `${ids[0]}_${ids[1]}`;
    }, [currentUser?.id, safeFriendId, isGroup]);
    
    const isUserOnline = useMemo(() => {
        if (!safeFriendId) return false;
        const isConnected = currentUser?.id ? !!onlineUsers[currentUser.id] : false;
        const isPresent = !!onlineUsers[safeFriendId];
        const isDbOnline = friendData?.db_is_online === true;
        return isConnected ? isPresent : isDbOnline;
    }, [onlineUsers, safeFriendId, friendData, currentUser]);

    const {
        messages, loading, loadingMore, isTyping, handleSendMessage: handleSendMessageOriginal,
        handleTypingStatus, handleReact, handleSaveEdit, handleDeleteMessage, handleForwardMessage,
        flyingEmoji, isMember, handleLoadMore
    } = chatRoom;

    const { handleStartCall } = useCallManager(currentUser, [], false);

    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [editingMessage, setEditingMessage] = useState<any>(null);
    const [contextMenuVisible, setContextMenuVisible] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<any>(null);
    const [anchorY, setAnchorY] = useState(0);
    const [forwardModalVisible, setForwardModalVisible] = useState(false);
    const [forwardText, setForwardText] = useState('');
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerImage, setViewerImage] = useState<string | null>(null);
    const [ledgerVisible, setLedgerVisible] = useState(false);

    // New custom hooks for separated concerns
    const { 
        wallpaper, setWallpaper, draft, handleDraftChange
    } = useChatSync(roomId, safeFriendId, currentUser, isGroup === 'true', messages);

    const {
        handleClearChat, handleBlockToggle, handleUnfriend, handleSetWallpaper
    } = useChatActions(currentUser, safeFriendId, roomId, friendName as string, isGroup === 'true', isBlocked, setWallpaper);

    const handleSendMessage = async (text: string) => {
        if (!text.trim() || !currentUser) return;
        if (isBlocked) { Alert.alert("Blocked", "Unblock this user to send messages."); return; }
        if (iAmBlocked) { Alert.alert("Blocked", "You are blocked by this user."); return; }

        const replyId = replyingTo?.id;
        setReplyingTo(null);
        handleDraftChange('');

        try {
            await handleSendMessageOriginal(text, replyId);
        } catch (error) {
            console.error('[CHAT] Send failed:', error);
        }
    };

    const onSaveEdit = (text: string) => {
        if (editingMessage) {
            handleSaveEdit(editingMessage.id, text);
            setEditingMessage(null);
        }
    };

    const handleViewProfile = () => { router.push(`/profile/${friendId}` as any); };

    const handleLongPress = (message: any, y: number) => {
        setSelectedMessage(message);
        setAnchorY(y);
        setContextMenuVisible(true);
    };

    const handleMessageAction = (action: string) => {
        if (!selectedMessage) return;
        switch (action) {
            case 'reply': setReplyingTo(selectedMessage); setEditingMessage(null); break;
            case 'copy': Clipboard.setString(selectedMessage.message || ''); break;
            case 'forward': setForwardText(selectedMessage.message || ''); setForwardModalVisible(true); break;
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

    const handleForwardSubmit = (friendIds: string[]) => {
        handleForwardMessage(forwardText, friendIds);
        Alert.alert("Success", "Message forwarded");
    };

    const handleImagePress = (uri: string) => { setViewerImage(uri); setViewerVisible(true); };

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const keyboardShowListener = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
        const keyboardHideListener = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
        return () => { keyboardShowListener.remove(); keyboardHideListener.remove(); };
    }, []);

    if (!currentUser || (loading && messages.length === 0)) {
        const bottomPadding = safeBottom > 0 ? safeBottom : 12;
        return (
            <View style={{ flex: 1, backgroundColor: '#EBD8B7' }}>
                <View style={{ paddingTop: safeTop, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10 }}>
                    <Ionicons name="chevron-back" size={28} color="#F68537" style={{ opacity: 0.5 }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 4 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E2E8F0' }} />
                        <View>
                            <View style={{ width: 100, height: 16, backgroundColor: '#E2E8F0', borderRadius: 4, marginBottom: 4 }} />
                            <View style={{ width: 60, height: 10, backgroundColor: '#E2E8F0', borderRadius: 4 }} />
                        </View>
                    </View>
                </View>
                <View style={{ flex: 1, padding: 16 }}>
                    <View style={{ alignSelf: 'flex-start', width: '60%', height: 60, backgroundColor: 'white', borderRadius: 20, borderBottomLeftRadius: 4, marginBottom: 16, opacity: 0.6 }} />
                    <View style={{ alignSelf: 'flex-end', width: '50%', height: 45, backgroundColor: '#F68537', borderRadius: 20, borderBottomRightRadius: 4, marginBottom: 16, opacity: 0.3 }} />
                </View>
                <View style={{ paddingBottom: bottomPadding, backgroundColor: 'transparent' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 10 }}>
                        <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 25, height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, elevation: 2 }}>
                            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#E2E8F0', marginLeft: 8 }} />
                            <View style={{ flex: 1, height: 20, backgroundColor: '#E2E8F0', borderRadius: 4, marginHorizontal: 12 }} />
                            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#E2E8F0', marginRight: 8 }} />
                        </View>
                        <View style={{ height: 48, width: 48, borderRadius: 24, backgroundColor: '#F68537', opacity: 0.8 }} />
                    </View>
                </View>
            </View>
        );
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
                handleViewProfile={handleViewProfile}
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
                    onReply={(msg) => setReplyingTo(msg)}
                    friendName={friendName as string}
                    onLongPress={handleLongPress}
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
                    <View style={styles.unfriendedBanner}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="person-remove-outline" size={20} color="#F68537" />
                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#C2410C' }}>
                                Tum dono ab friends nahi ho
                            </Text>
                        </View>
                        <Text style={{ fontSize: 12, color: '#9A3412', textAlign: 'center', lineHeight: 18 }}>
                            Purani chat pad sakte ho, lekin message karne ke liye pehle friend request bhejna hoga.
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push(`/profile/${safeFriendId}` as any)}
                            style={styles.unfriendButton}
                        >
                            <Text style={{ color: 'white', fontWeight: '800', fontSize: 14, letterSpacing: 0.3 }}>
                                👤 Friend Request Bhejna
                            </Text>
                        </TouchableOpacity>
                    </View>
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
                    <View style={styles.blockedBanner}>
                        <Text style={{ color: '#6B7280', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                            {isBlocked 
                                ? `You have blocked ${friendName}. Unblock to send messages.` 
                                : `You cannot message ${friendName} because they have blocked you.`}
                        </Text>
                        {isBlocked && (
                            <TouchableOpacity 
                                onPress={handleBlockToggle}
                                style={{ marginTop: 8, paddingVertical: 4, paddingHorizontal: 12, backgroundColor: '#FFF7ED', borderRadius: 8 }}
                            >
                                <Text style={{ color: '#F68537', fontWeight: 'bold', fontSize: 12 }}>UNBLOCK</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
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
            />

            <MediaViewer
                visible={viewerVisible}
                onClose={() => setViewerVisible(false)}
                imageUrl={viewerImage || ''}
            />

            <CallScreen />

            <LedgerModal
                visible={ledgerVisible}
                onClose={() => setLedgerVisible(false)}
                friendId={safeFriendId}
                friendName={friendName as string}
                currentUser={currentUser}
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
    },
    unfriendedBanner: {
        marginHorizontal: 12,
        marginBottom: 10,
        borderRadius: 18,
        backgroundColor: '#FFF7ED',
        borderWidth: 1.5,
        borderColor: '#FED7AA',
        padding: 16,
        alignItems: 'center',
        gap: 8,
    },
    unfriendButton: {
        marginTop: 4,
        backgroundColor: '#F68537',
        paddingVertical: 10,
        paddingHorizontal: 28,
        borderRadius: 24,
        elevation: 2,
        shadowColor: '#F68537',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    blockedBanner: {
        padding: 20, 
        backgroundColor: 'white', 
        alignItems: 'center', 
        justifyContent: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6'
    }
});

export default ChatScreen;
