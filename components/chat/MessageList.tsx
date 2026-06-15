import React, { useCallback } from 'react';
import { View, Platform, UIManager, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
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

export default React.memo(function MessageList({
    messages, currentUser, onReply, onLongPress, onImagePress,
    friendName, flyingEmoji, onLoadMore, loadingMore = false, translatedMessages = {}, autoListenMode = false,
}: MessageListProps) {

    const {
        flatListRef, showScrollBtn, unreadCount, scrollPercentage,
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

    const renderFooter = useCallback(() => {
        if (!loadingMore) return null;
        return (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#F68537" />
            </View>
        );
    }, [loadingMore]);

    return (
        <View style={{ flex: 1 }}>
            <FlashList
                ref={flatListRef as any}
                inverted={true}
                data={groupedMessages}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                ListFooterComponent={renderFooter}
                contentContainerStyle={{ paddingVertical: 16 }}
                showsVerticalScrollIndicator={false}
                onEndReached={onLoadMore}
                onEndReachedThreshold={0.2}
                keyboardShouldPersistTaps="handled"
                onScroll={handleScroll}
                scrollEventThrottle={100}
                estimatedItemSize={70}
            />

            {showScrollBtn && (
                <ScrollToBottomButton onPress={scrollToBottom} unreadCount={unreadCount} scrollPercentage={scrollPercentage} />
            )}
        </View>
    );
});
