import React, { useRef, useEffect, useCallback } from 'react';
import { FlatList, View, Platform, LayoutAnimation, UIManager, ActivityIndicator, Text } from 'react-native';
import MessageItem from './MessageItem';

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

    useEffect(() => {
        if (messages.length > 0) {
            try {
                if (Platform.OS === 'ios') {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                } else if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                }
            } catch (e) {
                console.warn('LayoutAnimation failed:', e);
            }
        }
    }, [messages.length]);

    // ✅ Date Grouping Logic
    const groupedMessages = React.useMemo(() => {
        const items: any[] = [];
        let lastDate = '';

        messages.forEach((msg) => {
            if (!msg || !msg.created_at) return;
            const date = new Date(msg.created_at).toDateString();
            if (date !== lastDate) {
                items.push({ id: `date-${date}`, type: 'date', date });
                lastDate = date;
            }
            items.push({ ...msg, type: 'message' });
        });

        return items;
    }, [messages]);

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
            />
        );
    }, [currentUser?.id, onLongPress, onReply, onImagePress, friendName, flyingEmoji]);

    // ✅ useCallback - scroll to message memoize
    const handleScrollToMessage = useCallback((replyMsg: any) => {
        if (!replyMsg?.id) return;
        const index = messages.findIndex(m => m.id === replyMsg.id);
        if (index !== -1) {
            flatListRef.current?.scrollToIndex({
                index,
                animated: true,
                viewPosition: 0.5
            });
        }
    }, [messages]);

    // ✅ useCallback - keyExtractor memoize
    const keyExtractor = useCallback((item: any) => item.id, []);

    // ✅ Pagination - Jab user scroll karke top pe aaye
    const handleScrollBeginDrag = useCallback(({ nativeEvent }: any) => {
        if (nativeEvent.contentOffset.y <= 50 && onLoadMore) {
            onLoadMore();
        }
    }, [onLoadMore]);

    // ✅ Loading indicator upar (purane messages load ho rahe hain)
    const ListHeaderComponent = loadingMore ? (
        <View style={{ paddingVertical: 12, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#F68537" />
        </View>
    ) : null;

    return (
        <View style={{ flex: 1 }}>
            <FlatList
                ref={flatListRef}
                data={groupedMessages}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                ListHeaderComponent={ListHeaderComponent}
                contentContainerStyle={{ paddingVertical: 16 }}
                onContentSizeChange={() => {
                    if (!loadingMore) {
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }
                }}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                showsVerticalScrollIndicator={false}
                onScrollBeginDrag={handleScrollBeginDrag}
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
        </View>
    );
}
