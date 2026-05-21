import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, KeyboardAvoidingView, Platform, Text, TouchableOpacity, ActivityIndicator, Alert, Clipboard, Keyboard, StatusBar, StyleSheet, ScrollView, NativeModules } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import MessageList from '@/components/chat/MessageList';
import ChatInput from '@/components/chat/ChatInput';
import { supabase } from '@/lib/supabase';
import { useChatRoom } from '@/hooks/useChatRoom';
import ChatMenu from '@/components/chat/ChatMenu';
import MessageContextMenu from '@/components/chat/MessageContextMenu';
import ForwardMessageModal from '@/components/chat/ForwardMessageModal';
import MediaViewer from '@/components/chat/MediaViewer';
import CallScreen from '@/components/chat/CallScreen';
import LedgerModal from '@/components/chat/LedgerModal';
import { useCallManager } from '@/hooks/useCallManager';
import { useAuthStore } from '@/store/useAuthStore';
import { useFriendsStore } from '@/store/useFriendsStore';
import { useChatStore } from '@/store/useChatStore';
import * as Haptics from 'expo-haptics';
import { 
    saveLocalMessage, 
    getLocalMessages, 
    clearLocalChat, 
    saveChatClearTimestamp,
    saveLocalWallpaper, 
    getLocalWallpaper,
    saveLocalDraft,
    getLocalDraft,
    getPendingDeliveredMessages,
    markMessageDeliveredLocally
} from '@/lib/localDb';
import { useDbStore } from '@/store/useDbStore';
import { useDebugStore } from '@/store/useDebugStore';

function ChatScreen() {
    const logDebug = useCallback((msg: string) => {}, []);

    const params = useLocalSearchParams<{ id: string, name: string, isGroup?: string, image?: string }>();
    const insets = useSafeAreaInsets();
    const hasMeasured = insets.top > 0 || insets.bottom > 0;
    const safeTop = hasMeasured ? insets.top : (initialWindowMetrics?.insets?.top || StatusBar.currentHeight || 44);
    const safeBottom = hasMeasured ? insets.bottom : (initialWindowMetrics?.insets?.bottom || 0);
    const headerHeight = 0;
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const { id: friendId, name: friendName, isGroup, image: friendImage } = params;
    const router = useRouter();
    const safeFriendId = (friendId as string) || '';
    const { user: currentUser } = useAuthStore();
    const onlineUsers = useFriendsStore(state => state.onlineUsers);
    const combinedItems = useFriendsStore(state => state.combinedItems);
    const blockedUserIds = useFriendsStore(state => state.blockedUserIds);
    const { blockUser, unblockUser } = useFriendsStore();
    const [iAmBlocked, setIAmBlocked] = useState(false);
    const isBlocked = safeFriendId && blockedUserIds.includes(safeFriendId);

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

    useEffect(() => {
        checkBlockStatus();
        
        // Subscribe to block changes to update UI in real-time
        const channel = supabase
            .channel(`block-status-${safeFriendId}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'blocked_users' 
            }, async (payload) => {
                // Refresh local block list from store
                if (currentUser) {
                    await useFriendsStore.getState().fetchBlockedUsers(currentUser.id);
                }
                // Refresh "I am blocked" status
                checkBlockStatus();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [safeFriendId, checkBlockStatus, currentUser]);

    const friendData = useMemo(() => (combinedItems || []).find(f => f?.id === safeFriendId), [combinedItems, safeFriendId]);

    const chatRoom = useChatRoom(safeFriendId, currentUser, isGroup === 'true');
    
    // Generate a consistent Room ID for shared settings like wallpapers
    const roomId = useMemo(() => {
        if (isGroup === 'true') return safeFriendId;
        if (!currentUser?.id || !safeFriendId) return '';
        const ids = [currentUser.id, safeFriendId].sort();
        return `${ids[0]}_${ids[1]}`;
    }, [currentUser?.id, safeFriendId, isGroup]);
    
    // Check both Presence and DB status for maximum reliability
    const isUserOnline = useMemo(() => {
        if (!safeFriendId) return false;
        const currentUserId = currentUser?.id;
        const isConnected = currentUserId ? !!onlineUsers[currentUserId] : false;
        const isPresent = !!onlineUsers[safeFriendId];
        const isDbOnline = friendData?.db_is_online === true;
        console.log(`[DEBUG] ChatScreen Presence: friendId=${safeFriendId}, isConnected=${isConnected}, isPresent=${isPresent}, isDbOnline=${isDbOnline}`);
        return isConnected ? isPresent : isDbOnline;
    }, [onlineUsers, safeFriendId, friendData, currentUser]);

    const {
        messages,
        loading,
        loadingMore,
        isTyping,
        handleSendMessage: handleSendMessageOriginal,
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
    const { handleStartCall } = useCallManager(currentUser, [], false);

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

    // Wallpaper State
    const [wallpaper, setWallpaper] = useState<string | null>(null);
    const [draft, setDraft] = useState('');
    const [isDraftLoaded, setIsDraftLoaded] = useState(false);
    const [ledgerVisible, setLedgerVisible] = useState(false);

    const loadDraft = async () => {
        try {
            logDebug("Loading local draft for room: " + roomId);
            const { db } = useDbStore.getState();
            if (db && roomId) {
                const savedDraft = await getLocalDraft(db, roomId);
                setDraft(savedDraft || '');
                logDebug("Draft loaded: " + (savedDraft ? savedDraft.substring(0, 15) : "empty"));
                setIsDraftLoaded(true);
            } else {
                logDebug("DB not ready for draft loading");
                setIsDraftLoaded(true); // Don't block UI if DB not ready
            }
        } catch (e: any) {
            logDebug("Draft load error: " + e.message);
            console.error('[DRAFT] Load failed:', e);
            setIsDraftLoaded(true);
        }
    };

    const handleDraftChange = (text: string) => {
        setDraft(text);
        const { db } = useDbStore.getState();
        if (db && roomId) {
            saveLocalDraft(db, roomId, text);
        }
    };

    const loadWallpaper = async () => {
        try {
            const { db } = useDbStore.getState();
            if (db && roomId) {
                logDebug(`Loading shared wallpaper for room: ${roomId}`);
                let uri = await getLocalWallpaper(db, roomId);
                
                // Only fetch from Supabase if we don't have it locally or just to sync
                const { data, error } = await supabase
                    .from('chat_wallpapers')
                    .select('wallpaper_url')
                    .eq('chat_id', roomId)
                    .maybeSingle();
                
                if (!error && data?.wallpaper_url) {
                    uri = data.wallpaper_url;
                    await saveLocalWallpaper(db, roomId, uri);
                }
                setWallpaper(uri);
                logDebug("Wallpaper loaded successfully: " + (uri ? "Yes" : "No"));
            } else {
                logDebug("DB not ready for wallpaper loading");
            }
        } catch (e: any) {
            logDebug("Wallpaper load error: " + e.message);
            console.error('[WALLPAPER] Load failed:', e);
        }
    };

    const markMessagesAsReadLocally = useCallback(async () => {
        try {
            logDebug("Marking messages as read locally...");
            const { db } = useDbStore.getState();
            if (db && safeFriendId && currentUser?.id) {
                await db.runAsync(
                    'UPDATE messages SET status = ? WHERE receiver_id = ? AND sender_id = ? AND status != ?',
                    ['read', currentUser.id, safeFriendId, 'read']
                );
                logDebug("Messages marked as read locally");
            } else {
                logDebug("DB/Ids not ready for marking read");
            }
        } catch (e: any) {
            logDebug("Mark read failed: " + e.message);
            console.warn('[DB] Mark read failed:', e);
        }
    }, [safeFriendId, currentUser?.id]);

    // Sync 'delivered' status for messages that arrived while app was closed
    const syncDeliveredReceipts = useCallback(async () => {
        const { db } = useDbStore.getState();
        if (!db || !currentUser?.id || !safeFriendId) return;
        try {
            // Get messages received by me that are still 'sent' (not yet delivered)
            const pending = await getPendingDeliveredMessages(db, currentUser.id);
            if (pending.length === 0) return;

            console.log(`[DELIVERED] Syncing ${pending.length} pending messages...`);

            for (const msg of pending) {
                // 1. Update local DB
                await markMessageDeliveredLocally(db, msg.id);
            }

            // 2. Batch update Supabase
            const ids = pending.map((m: any) => m.id);
            await supabase
                .from('messages')
                .update({ status: 'delivered' })
                .in('id', ids);

            console.log('[DELIVERED] Batch sync complete:', ids.length, 'messages');
        } catch (e) {
            console.warn('[DELIVERED] Sync failed:', e);
        }
    }, [currentUser?.id, safeFriendId]);

    const syncReadReceipts = useCallback(async () => {
        const { db } = useDbStore.getState();
        if (db && safeFriendId && currentUser?.id) {
            try {
                // Find messages that are 'read' locally but we haven't synced yet
                // For simplicity, we just update all delivered messages to read for this chat on Supabase
                const { error } = await supabase
                    .from('messages')
                    .update({ status: 'read' })
                    .eq('receiver_id', currentUser.id)
                    .eq('sender_id', safeFriendId)
                    .eq('status', 'delivered');

                if (error) throw error;
                console.log('[SYNC] Read receipts synced to Supabase');
            } catch (error) {
                console.error('[SYNC] Read receipts failed:', error);
            }
        }
    }, [safeFriendId, currentUser?.id]);

    useEffect(() => {
        setWallpaper(null);
        logDebug("Triggering loadWallpaper()...");
        loadWallpaper();
        logDebug("Triggering loadDraft()...");
        loadDraft();
        logDebug("Triggering markMessagesAsReadLocally()...");
        markMessagesAsReadLocally();
        logDebug("Triggering syncDeliveredReceipts()...");
        syncDeliveredReceipts(); // Sync delivered for messages received while app was closed
    }, [roomId]);



    // Batch sync read receipts every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            syncReadReceipts();
        }, 10000);
        return () => clearInterval(interval);
    }, [syncReadReceipts]);

    const syncPendingMessages = useCallback(async () => {
        const { db } = useDbStore.getState();
        if (db && roomId && currentUser?.id) {
            try {
                const pending = await db.getAllAsync<any>(
                    'SELECT * FROM messages WHERE status = ? AND (receiver_id = ? OR group_id = ?)',
                    ['pending', safeFriendId, safeFriendId]
                );

                if (pending.length > 0) {
                    let syncedCount = 0;
                    for (const msg of pending) {
                        // FIX: Prevent race condition! Ignore messages created in the last 10 seconds.
                        // They are actively being sent by handleSendMessageOriginal.
                        const ageMs = Date.now() - new Date(msg.created_at).getTime();
                        if (ageMs < 10000) continue;

                        syncedCount++;
                        const { data, error } = await supabase
                            .from('messages')
                            .insert([{
                                sender_id: msg.sender_id,
                                receiver_id: msg.receiver_id,
                                group_id: msg.group_id,
                                message: msg.message,
                                status: 'sent',
                                created_at: msg.created_at
                            }])
                            .select()
                            .single();
                        
                        if (!error && data) {
                            await db.runAsync('DELETE FROM messages WHERE id = ?', [msg.id]);
                            await saveLocalMessage(db, { ...data, status: 'sent' });
                        }
                    }
                    if (syncedCount > 0) console.log(`[OFFLINE] Synced ${syncedCount} old pending messages.`);
                }
            } catch (error) {
                console.error('[OFFLINE] Sync failed:', error);
            }
        }
    }, [roomId, safeFriendId, currentUser?.id]);

    useEffect(() => {
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            // Trigger wallpaper refresh if a wallpaper change message is detected
            if (lastMsg.message?.includes('changed the chat wallpaper')) {
                loadWallpaper();
            }
            
            // Mark as read locally whenever new messages arrive and we are in the screen
            if (lastMsg.sender_id !== currentUser?.id) {
                markMessagesAsReadLocally();
            }
        }
    }, [messages, markMessagesAsReadLocally]);

    // Try syncing pending messages on mount and interval, not on every keystroke
    useEffect(() => {
        syncPendingMessages();
        const interval = setInterval(syncPendingMessages, 8000);
        return () => clearInterval(interval);
    }, [syncPendingMessages]);

    const handleSetWallpaper = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [9, 16],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0].uri && currentUser?.id && roomId) {
            const tempUri = result.assets[0].uri;
            try {
                // 1. Save locally FIRST for instant persistence
                const { db } = useDbStore.getState();
                const filename = `wallpaper_${roomId}.jpg`;
                const permanentUri = `${FileSystem.documentDirectory}${filename}`;
                
                // Copy to permanent storage
                await FileSystem.copyAsync({ from: tempUri, to: permanentUri });
                
                // Update UI and Local DB immediately
                setWallpaper(permanentUri);
                if (db) await saveLocalWallpaper(db, roomId, permanentUri);

                // 2. Upload to Cloudinary in background for sync
                const formData = new FormData();
                formData.append('file', { uri: tempUri, type: 'image/jpeg', name: 'wallpaper.jpg', } as any);
                formData.append('upload_preset', process.env.VITE_CLOUDINARY_UPLOAD_PRESET || '');
                
                const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${process.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
                const cloudData = await cloudRes.json();
                const remoteUrl = cloudData.secure_url;

                if (remoteUrl) {
                    const systemMsg = {
                        id: `system_${Date.now()}`,
                        sender_id: currentUser.id,
                        receiver_id: isGroup === 'true' ? null : safeFriendId,
                        group_id: isGroup === 'true' ? safeFriendId : null,
                        message: `SYSTEM_MSG: ✨ ${currentUser.username || currentUser.full_name || 'Someone'} changed the chat wallpaper`,
                        status: 'sent',
                        created_at: new Date().toISOString(),
                    };

                    // 1. Save to Supabase
                    const { data: remoteData, error: remoteError } = await supabase
                        .from('messages')
                        .insert([{ ...systemMsg, id: undefined }])
                        .select()
                        .single();

                    // 2. Update Supabase Wallpaper entry
                    await supabase.from('chat_wallpapers').upsert({ 
                        chat_id: roomId, 
                        wallpaper_url: remoteUrl, 
                        user_id: currentUser.id 
                    });

                    // 3. Save LOCALLY so it shows up immediately
                    const { db } = useDbStore.getState();
                    if (db) {
                        await saveLocalMessage(db, remoteData || systemMsg);
                    }

                    Alert.alert("Success", "Wallpaper updated for everyone!");
                }
            } catch (error) {
                console.error("Wallpaper Sync Error:", error);
                Alert.alert("Sync Error", "Failed to update shared wallpaper, but it's saved locally.");
            }
        }
    };

    const handleSendMessage = async (text: string) => {
        if (!text.trim() || !currentUser) return;
        
        if (isBlocked) {
            Alert.alert("Blocked", "Unblock this user to send messages.");
            return;
        }

        if (iAmBlocked) {
            Alert.alert("Blocked", "You are blocked by this user.");
            return;
        }


        const replyId = replyingTo?.id;
        
        // Clear UI states immediately for better UX
        setReplyingTo(null);
        setDraft('');
        handleDraftChange('');

        try {
            // Use the store's method which handles Optimistic UI, Encryption, and Local DB
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

    const handleClearChat = async () => {
        Alert.alert("Clear Chat", "Are you sure you want to clear this chat for yourself? (Friend will still see the messages)", [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Clear for Me", 
                style: "destructive", 
                onPress: async () => {
                    try {
                        const now = new Date().toISOString();
                        const { db } = useDbStore.getState();

                        // 1. Save "Clear" timestamp LOCALLY
                        if (db) {
                            await saveChatClearTimestamp(db, safeFriendId, now);
                            // 2. Clear from Local Messages table (Physical Delete)
                            await clearLocalChat(db, friendId as string, isGroup === 'true');
                        }

                        // 3. Clear Zustand Store & Cache
                        useChatStore.setState((state) => {
                            const newCache = { ...state.cache };
                            if (newCache[safeFriendId]) {
                                newCache[safeFriendId] = { ...newCache[safeFriendId], messages: [] };
                            }
                            return { 
                                messages: [], 
                                cache: newCache 
                            };
                        });

                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        Alert.alert("Success", "Chat cleared for you.");
                    } catch (e: any) {
                        console.error('[CHAT] Clear for me failed:', e);
                        Alert.alert("Error", `Failed to clear chat locally: ${e.message || 'Unknown error'}`);
                    }
                } 
            }
        ]);
    };

    const handleBlockToggle = async () => {
        if (!currentUser) return;
        if (isBlocked) {
            await unblockUser(currentUser.id, friendId as string);
        } else {
            Alert.alert("Block User", `Are you sure you want to block ${friendName}?`, [
                { text: "Cancel", style: "cancel" },
                { text: "Block", style: "destructive", onPress: async () => { await blockUser(currentUser.id, friendId as string); } }
            ]);
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
                Alert.alert(
                    "Delete Message", 
                    "Choose how you want to delete this message.", 
                    [
                        { text: "Cancel", style: "cancel" },
                        { 
                            text: "Delete for Me", 
                            onPress: () => handleDeleteMessage(selectedMessage.id, false) 
                        },
                        { 
                            text: "Delete for Everyone", 
                            style: "destructive", 
                            onPress: () => handleDeleteMessage(selectedMessage.id, true) 
                        }
                    ]
                ); 
                break;
        }
    };

    const handleForwardSubmit = (friendIds: string[]) => {
        handleForwardMessage(forwardText, friendIds);
        Alert.alert("Success", "Message forwarded");
    };

    const handleImagePress = (uri: string) => { setViewerImage(uri); setViewerVisible(true); };

    const formatLastSeen = (timestamp: string) => {
        if (!timestamp) return 'offline';
        const date = new Date(timestamp);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (diffInDays === 0 && now.getDate() === date.getDate()) return `last seen today at ${timeStr}`;
        if (diffInDays === 1 || (diffInDays === 0 && now.getDate() !== date.getDate())) return `last seen yesterday at ${timeStr}`;
        return `last seen ${date.toLocaleDateString()}`;
    };

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
                {/* Header Skeleton matching the loaded header style */}
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

                {/* Message Body Skeleton */}
                <View style={{ flex: 1, padding: 16 }}>
                    <View style={{ alignSelf: 'flex-start', width: '60%', height: 60, backgroundColor: 'white', borderRadius: 20, borderBottomLeftRadius: 4, marginBottom: 16, opacity: 0.6 }} />
                    <View style={{ alignSelf: 'flex-end', width: '50%', height: 45, backgroundColor: '#F68537', borderRadius: 20, borderBottomRightRadius: 4, marginBottom: 16, opacity: 0.3 }} />
                </View>

                {/* Input Skeleton matching ChatInput layout exactly */}
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

            <View style={{ paddingTop: safeTop, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 10, zIndex: 1000, elevation: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity onPress={() => { Haptics.selectionAsync(); router.back(); }}>
                        <Ionicons name="chevron-back" size={28} color="#F68537" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={isGroup === 'true' ? () => router.push(`/group-info?groupId=${friendId}&groupName=${encodeURIComponent(friendName || 'Group')}&groupImage=${encodeURIComponent(friendImage || '')}` as any) : handleViewProfile} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Image source={{ uri: friendImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(friendName || 'User')}&backgroundColor=F68537` }} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#F68537' }} contentFit="cover" />
                        <View>
                            <Text style={{ fontWeight: '900', color: '#F68537', fontSize: 16, letterSpacing: -0.5 }}>{friendName || 'User'}</Text>
                            <Text style={{ fontSize: 10, color: isTyping ? '#10B981' : (isUserOnline ? '#10B981' : '#94A3B8'), fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                {isTyping || friendData?.isTyping ? 'typing...' : (isUserOnline ? 'online' : formatLastSeen(friendData?.lastSeen))}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity 
                        onPress={() => {
                            if (isBlocked) Alert.alert("Blocked", "Unblock this user to call.");
                            else if (iAmBlocked) Alert.alert("Blocked", "You are blocked by this user.");
                            else handleStartCall({ id: friendId, name: friendName }, 'video', isGroup === 'true');
                        }} 
                        style={{ backgroundColor: (isBlocked || iAmBlocked) ? '#D1D5DB' : '#F68537', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
                        disabled={isBlocked || iAmBlocked}
                    >
                        <Ionicons name="videocam" size={18} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => {
                            if (isBlocked) Alert.alert("Blocked", "Unblock this user to call.");
                            else if (iAmBlocked) Alert.alert("Blocked", "You are blocked by this user.");
                            else handleStartCall({ id: friendId, name: friendName }, 'audio', isGroup === 'true');
                        }} 
                        style={{ backgroundColor: (isBlocked || iAmBlocked) ? '#D1D5DB' : '#F68537', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
                        disabled={isBlocked || iAmBlocked}
                    >
                        <Ionicons name="call" size={18} color="white" />
                    </TouchableOpacity>
 
                    <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)} style={{ padding: 4 }}>
                        <Ionicons name="ellipsis-vertical" size={24} color="#F68537" />
                    </TouchableOpacity>
                    <ChatMenu 
                        visible={menuVisible} 
                        onClose={() => setMenuVisible(false)} 
                        onViewProfile={handleViewProfile} 
                        onGroupInfo={() => router.push(`/group-info?groupId=${friendId}&groupName=${encodeURIComponent(friendName || 'Group')}&groupImage=${encodeURIComponent(friendImage || '')}` as any)}
                        onClearChat={handleClearChat} 
                        onBlockUser={handleBlockToggle} 
                        isBlocked={isBlocked} 
                        isMember={isMember} 
                        isGroup={isGroup === 'true'} 
                        onLeaveGroup={async () => {
                            if (!currentUser?.id || !friendId) return;
                            const success = await useFriendsStore.getState().leaveGroup(currentUser.id, friendId);
                            if (success) router.back();
                        }} 
                        onSetWallpaper={handleSetWallpaper} 
                        onLedger={() => { setMenuVisible(false); setLedgerVisible(true); }} 
                    />
                </View>
            </View>

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
                            <Text style={styles.typingText}>{friendName} is typing...</Text>
                        </View>
                    </View>
                )}

                {!isBlocked && !iAmBlocked && (
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
                    <View style={{ 
                        padding: 20, 
                        backgroundColor: 'white', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        borderTopWidth: 1,
                        borderTopColor: '#F3F4F6'
                    }}>
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
                messageText={forwardText}
            />

            <MediaViewer
                visible={viewerVisible}
                imageUri={viewerImage}
                onClose={() => setViewerVisible(false)}
            />
            
            <DebugConsole />
            <LedgerModal 
                visible={ledgerVisible}
                onClose={() => setLedgerVisible(false)}
                friendId={safeFriendId}
                friendName={friendName || 'Friend'}
            />

 
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    typingIndicatorContainer: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        position: 'absolute',
        bottom: 70, // Above ChatInput
        left: 0,
    },
    typingBubble: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderBottomLeftRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        maxWidth: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    typingText: {
        fontSize: 13,
        color: '#10B981',
        fontWeight: '600',
        fontStyle: 'italic',
    }
});

class ChatErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null, errorInfo: any }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error("[CRITICAL_SCREEN_ERROR]", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF5E6', padding: 20, justifyContent: 'center' }}>
                    <View style={{ backgroundColor: '#FEE2E2', borderLeftWidth: 5, borderColor: '#EF4444', padding: 15, borderRadius: 8, marginBottom: 15 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#991B1B', marginBottom: 5 }}>⚠️ Chat Screen Error Caught!</Text>
                        <Text style={{ fontSize: 14, color: '#B91C1C', fontWeight: '600' }}>Error: {this.state.error?.message}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#4B5563', fontWeight: 'bold', marginBottom: 5 }}>STACK TRACE:</Text>
                    <View style={{ backgroundColor: '#1E293B', padding: 12, borderRadius: 8, flex: 0.8 }}>
                        <ScrollView>
                            <Text style={{ color: '#F1F5F9', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 10 }}>
                                {this.state.error?.stack || "No stack trace available"}
                            </Text>
                            {this.state.errorInfo && (
                                <Text style={{ color: '#94A3B8', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 10, marginTop: 10 }}>
                                    Component Stack: {this.state.errorInfo.componentStack}
                                </Text>
                            )}
                        </ScrollView>
                    </View>
                    <TouchableOpacity 
                        onPress={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                        style={{ backgroundColor: '#F68537', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 15 }}
                    >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>Try Reloading Chat</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            );
        }
        return this.props.children;
    }
}

export default function ChatScreenWithErrorBoundary() {
    return (
        <ChatErrorBoundary>
            <ChatScreen />
        </ChatErrorBoundary>
    );
}
