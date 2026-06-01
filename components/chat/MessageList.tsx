import React, { useCallback } from 'react';
import { FlatList, View, Platform, UIManager, ActivityIndicator } from 'react-native';
import MessageItem from './MessageItem';
import { useChatStore } from '@/store/useChatStore';
import { SystemMessage, DateSeparator, ScrollToBottomButton } from './MessageListItems';
import { useMessageList } from '@/hooks/chatRoom/useMessageList';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MessageListProps {
    messages: any[];
    currentUser: any;
    onReply?: (message: any) => void;
    onLongPress?: (message: any, y: number) => void;
    onImagePress?: (uri: string) => void;
    friendName?: string;
    flyingEmoji?: any;
    onLoadMore?: () => void;
    loadingMore?: boolean;
    translatedMessages?: Record<string, { text: string; lang: string }>;
    autoListenMode?: boolean;
}

export default function MessageList({
    messages, currentUser, onReply, onLongPress, onImagePress,
    friendName, flyingEmoji, onLoadMore, loadingMore = false, translatedMessages = {}, autoListenMode = false,
}: MessageListProps) {

    const {
        flatListRef, showScrollBtn, unreadCount,
        groupedMessages, handleScroll, scrollToBottom, handleScrollToMessage,
    } = useMessageList(messages, currentUser);

    const renderItem = useCallback(({ item }: { item: any }) => {
        if (item.file_type === 'system') {
            return <SystemMessage message={item.message} createdAt={item.created_at} />;
        }
        if (item.type === 'date') {
            return <DateSeparator date={item.date} />;
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
                translatedText={translatedMessages[item.id] || null}
                autoListenMode={autoListenMode}
            />
        );
    }, [currentUser?.id, onLongPress, onReply, onImagePress, friendName, flyingEmoji, handleScrollToMessage, translatedMessages, autoListenMode]);

    const keyExtractor = useCallback((item: any) => item.id, []);

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

            {showScrollBtn && (
                <ScrollToBottomButton onPress={scrollToBottom} unreadCount={unreadCount} />
            )}
        </View>
    );
}
