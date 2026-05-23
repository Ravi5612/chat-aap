import React, { useRef, useEffect, useCallback, useState } from 'react';
import { FlatList, View, Platform, LayoutAnimation, UIManager, ActivityIndicator, Text, TouchableOpacity, Animated } from 'react-native';
import MessageItem from './MessageItem';
import { useChatStore } from '@/store/useChatStore';
import { Ionicons } from '@expo/vector-icons';

interface MessageListProps {
    messages: any[];
    currentUser: any;
    onReply?: (message: any) => void;
    onLongPress?: (message: any, y: number) => void;
    onImagePress?: (uri: string) => void;
    friendName?: string;
    flyingEmoji?: any;
    onLoadMore?: () => void;   // ✅ Pagination callback
    loadingMore?: boolean;     // ✅ Loading indicator upar
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function MessageList({
    messages,
    currentUser,
    onReply,
    onLongPress,
    onImagePress,
    friendName,
    flyingEmoji,
    onLoadMore,
    loadingMore = false,
}: MessageListProps) {
    const flatListRef = useRef<FlatList>(null);
    // \u2705 Subscribe to upload progress map so image bubbles get live percentage
    const uploadProgress = useChatStore(state => state.uploadProgress);

    // ── Scroll-to-bottom button state ──────────────────────────────────
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const isAtBottomRef = useRef(true);           // inverted list: offset=0 = latest msgs
    const prevMsgCountRef = useRef(messages.length);
    const btnOpacity = useRef(new Animated.Value(0)).current;

    // Track new messages while scrolled away from bottom
    useEffect(() => {
        const newCount = messages.length;
        const prevCount = prevMsgCountRef.current;

        if (!isAtBottomRef.current && newCount > prevCount) {
            const diff = newCount - prevCount;
            setUnreadCount(prev => prev + diff);
        }
        prevMsgCountRef.current = newCount;
    }, [messages.length]);

    // Simple visibility toggle instead of complex animations
    const showBtn = useCallback(() => {
        setShowScrollBtn(true);
    }, []);

    const hideBtn = useCallback(() => {
        setShowScrollBtn(false);
    }, []);

    const handleScroll = useCallback((event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        // inverted FlatList: offset 0 = bottom (latest messages)
        const atBottom = offsetY < 60;
        isAtBottomRef.current = atBottom;

        if (atBottom) {
            setUnreadCount(0);
            hideBtn();
        } else {
            showBtn();
        }
    }, [showBtn, hideBtn]);

    const scrollToBottom = useCallback(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        setUnreadCount(0);
        isAtBottomRef.current = true;
        hideBtn();
    }, [hideBtn]);
    // ──────────────────────────────────────────────────────────────────

    // ✅ Date Grouping Logic - For Inverted list, newest first
    const groupedMessages = React.useMemo(() => {
        const items: any[] = [];
        let lastDate = '';

        // Messages are usually [oldest...newest]. 
        // For inverted list we need [newest...oldest]
        const sortedMessages = [...messages].reverse();

        sortedMessages.forEach((msg, index) => {
            if (!msg || !msg.created_at) return;
            
            items.push({ ...msg, type: 'message' });

            const date = new Date(msg.created_at).toDateString();
            const nextMsg = sortedMessages[index + 1];
            const nextDate = nextMsg ? new Date(nextMsg.created_at).toDateString() : '';

            if (date !== nextDate) {
                items.push({ id: `date-${date}`, type: 'date', date });
            }
        });

        return items;
    }, [messages]);

    // ✅ useCallback - scroll to message memoize
    const handleScrollToMessage = useCallback(async (replyMsg: any) => {
        if (!replyMsg?.id) return;
        // Search in groupedMessages which contains both dates and messages
        let index = groupedMessages.findIndex(m => m.id === replyMsg.id);
        if (index !== -1) {
            flatListRef.current?.scrollToIndex({
                index,
                animated: true,
                viewPosition: 0.5
            });
            return;
        }

        // Fallback: If target message isn't loaded in memory yet
        const firstMessage = messages.find(m => m.id && !m.id.startsWith('date-') && m.file_type !== 'system');
        if (!firstMessage) return;

        const isGroup = !!firstMessage.group_id;
        const friendId = isGroup ? firstMessage.group_id : (firstMessage.sender_id === currentUser?.id ? firstMessage.receiver_id : firstMessage.sender_id);

        if (!friendId || !currentUser) return;

        const success = await useChatStore.getState().loadMessagesUpToId(
            friendId,
            currentUser,
            isGroup,
            replyMsg.id,
            replyMsg.created_at
        );

        if (success) {
            setTimeout(() => {
                const latestMessages = useChatStore.getState().messages;
                const sortedMessages = [...latestMessages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                const items: any[] = [];
                sortedMessages.forEach((msg, idx) => {
                    items.push(msg);
                    const date = new Date(msg.created_at).toDateString();
                    const nextMsg = sortedMessages[idx + 1];
                    const nextDate = nextMsg ? new Date(nextMsg.created_at).toDateString() : '';

                    if (date !== nextDate) {
                        items.push({ id: `date-${date}`, type: 'date', date });
                    }
                });

                const newIndex = items.findIndex(m => m.id === replyMsg.id);
                if (newIndex !== -1) {
                    flatListRef.current?.scrollToIndex({
                        index: newIndex,
                        animated: true,
                        viewPosition: 0.5
                    });
                }
            }, 300);
        }
    }, [groupedMessages, messages, currentUser]);

    // ✅ useCallback - renderItem function baar baar recreate nahi hoga
    const renderItem = useCallback(({ item }: { item: any }) => {
        if (item.file_type === 'system') {
            const time = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
                <View style={{ alignItems: 'center', marginVertical: 10, paddingHorizontal: 20 }}>
                    <View style={{ backgroundColor: 'rgba(246, 133, 55, 0.08)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(246, 133, 55, 0.2)' }}>
                        <Text style={{ fontSize: 13, color: '#F68537', fontWeight: '600', textAlign: 'center' }}>
                            {item.message}
                        </Text>
                        <Text style={{ fontSize: 10, color: 'rgba(246, 133, 55, 0.6)', textAlign: 'center', marginTop: 2, fontWeight: 'bold' }}>
                            {time}
                        </Text>
                    </View>
                </View>
            );
        }

        if (item.type === 'date') {
            const getDayLabel = (dateStr: string) => {
                const date = new Date(dateStr);
                const today = new Date();
                const yesterday = new Date();
                yesterday.setDate(today.getDate() - 1);

                if (date.toDateString() === today.toDateString()) {
                    return 'TODAY';
                } else if (date.toDateString() === yesterday.toDateString()) {
                    return 'YESTERDAY';
                } else {
                    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
                }
            };

            return (
                <View style={{ alignItems: 'center', marginVertical: 20 }}>
                    <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
                        <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '800', letterSpacing: 0.5 }}>
                            {getDayLabel(item.date)}
                        </Text>
                    </View>
                </View>
            );
        }

        return (
            <MessageItem
                message={item}
                isCurrentUser={item.sender_id === currentUser?.id}
                onLongPress={onLongPress}
                onReply={onReply}
                onReplyClick={handleScrollToMessage}
                onImagePress={onImagePress}
                friendName={friendName}
                flyingEmoji={flyingEmoji}
                uploadProgress={uploadProgress[item.id]}
            />
        );
    }, [currentUser?.id, onLongPress, onReply, onImagePress, friendName, flyingEmoji, handleScrollToMessage, uploadProgress]);


    // ✅ useCallback - keyExtractor memoize
    const keyExtractor = useCallback((item: any) => item.id, []);

    // ✅ For inverted list, loadingMore (old messages) should be at the BOTTOM (ListFooterComponent)
    const ListFooterComponent = loadingMore ? (
        <View style={{ paddingVertical: 12, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#F68537" />
        </View>
    ) : null;

    return (
        <View style={{ flex: 1 }}>
            <FlatList
                ref={flatListRef}
                inverted={true}
                data={groupedMessages}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                ListFooterComponent={ListFooterComponent}
                contentContainerStyle={{ paddingVertical: 16 }}
                showsVerticalScrollIndicator={false}
                onEndReached={onLoadMore}
                onEndReachedThreshold={0.2}
                keyboardShouldPersistTaps="handled"
                onScroll={handleScroll}
                scrollEventThrottle={100}
                onScrollToIndexFailed={(info) => {
                    flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
                    setTimeout(() => {
                        flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
                    }, 100);
                }}
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews={Platform.OS === 'android'}
            />

            {/* ── Scroll-to-Bottom Floating Button (SIMPLIFIED & ROBUST) ── */}
            {showScrollBtn && (
                <View
                    style={{
                        position: 'absolute',
                        bottom: 20, // slightly higher to ensure it's not covered by input padding
                        right: 16,
                        zIndex: 9999, // ultra high z-index
                        elevation: 10,
                    }}
                >
                    <TouchableOpacity
                        onPress={scrollToBottom}
                        activeOpacity={0.8}
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: 'white',
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 5,
                            elevation: 10,
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                        }}
                    >
                        <Ionicons name="chevron-down" size={26} color="#F68537" />
                    </TouchableOpacity>

                    {/* Unread count badge */}
                    {unreadCount > 0 && (
                        <View style={{
                            position: 'absolute',
                            top: -8,
                            right: -6,
                            backgroundColor: '#EF4444', // Red for higher visibility
                            borderRadius: 12,
                            minWidth: 24,
                            height: 24,
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingHorizontal: 6,
                            borderWidth: 2,
                            borderColor: 'white',
                            zIndex: 10000,
                            elevation: 11,
                        }}>
                            <Text style={{
                                color: 'white',
                                fontSize: 11,
                                fontWeight: '900',
                            }}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}
