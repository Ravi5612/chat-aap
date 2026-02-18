import React, { useRef, useEffect, useCallback } from 'react';
import { FlatList, View, Platform, LayoutAnimation, UIManager, ActivityIndicator } from 'react-native';
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
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }, [messages.length]);

    // ✅ useCallback - renderItem function baar baar recreate nahi hoga
    const renderItem = useCallback(({ item }: { item: any }) => (
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
    ), [currentUser?.id, onLongPress, onReply, onImagePress, friendName, flyingEmoji]);

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
                data={messages}
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
