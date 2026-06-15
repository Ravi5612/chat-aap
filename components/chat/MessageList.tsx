import React, { useCallback } from 'react';
import { View, Platform, UIManager, ActivityIndicator, FlatList } from 'react-native';
import MessageItem from './MessageItem';
import { useChatStore } from '@/store/useChatStore';
import { SystemMessage, DateSeparator, ScrollToBottomButton } from './MessageListItems';
import { useMessageList } from '@/hooks/chatRoom/useMessageList';
import { ComponentErrorBoundary } from '@/components/ui/ComponentErrorBoundary';

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
    onStartCall?: (type: 'audio' | 'video') => void;
}

export default React.memo(function MessageList({
    messages, currentUser, onReply, onLongPress, onImagePress,
    friendName, flyingEmoji, onLoadMore, loadingMore = false, translatedMessages = {}, autoListenMode = false, onStartCall
}: MessageListProps) {
    const scrollBtnRef = React.useRef<any>(null);

    const {
        flatListRef, showScrollBtn, unreadCount,
        groupedMessages, handleScroll, scrollToBottom, handleScrollToMessage,
    } = useMessageList(messages, currentUser, scrollBtnRef);

    const renderItem = useCallback(({ item }: { item: any }) => {
        if (item.file_type === 'system') {
            return (
                <ComponentErrorBoundary fallbackName="System Message">
                    <SystemMessage message={item.message} createdAt={item.created_at} />
                </ComponentErrorBoundary>
            );
        }
        if (item.type === 'date') {
            return (
                <ComponentErrorBoundary fallbackName="Date Separator">
                    <DateSeparator date={item.date} />
                </ComponentErrorBoundary>
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
                translatedText={translatedMessages[item.id] || null}
                autoListenMode={autoListenMode}
                onStartCall={onStartCall}
            />
        );
    }, [currentUser?.id, onLongPress, onReply, onImagePress, friendName, flyingEmoji, handleScrollToMessage, translatedMessages, autoListenMode, onStartCall]);

    const keyExtractor = useCallback((item: any, index: number) => item?.id ? String(item.id) : `fallback-${index}`, []);

    const getItemType = useCallback((item: any) => {
        if (item.type === 'date') return 'date';
        if (item.file_type === 'system') return 'system';
        if (item.message_type?.startsWith('game_')) return item.message_type;
        if (item.message_type === 'watch_party') return 'watch_party';
        if (item.message_type === 'info') return 'info';
        if (item.message_type === 'call_log' || item.file_type === 'call_log') return 'call_log';
        if (item.file_type === 'deleted' || item.message_type === 'deleted') return 'deleted';
        if (item.file_type) return item.file_type;
        return 'text';
    }, []);

    const renderFooter = useCallback(() => {
        if (!loadingMore) return null;
        return (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#F68537" />
            </View>
        );
    }, [loadingMore]);

    return (
        <ComponentErrorBoundary fallbackName="Message List">
            <View style={{ flex: 1 }}>
                <FlatList
                    ref={flatListRef as any}
                    inverted={true}
                    data={groupedMessages}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    ListHeaderComponent={<View style={{ height: 16 }} />}
                    ListFooterComponent={
                        <View>
                            {loadingMore && (
                                <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                                    <ActivityIndicator size="small" color="#F68537" />
                                </View>
                            )}
                            <View style={{ height: 16 }} />
                        </View>
                    }
                    contentContainerStyle={{}}
                    showsVerticalScrollIndicator={false}
                    onEndReached={onLoadMore}
                    onEndReachedThreshold={0.2}
                    keyboardShouldPersistTaps="handled"
                    onScroll={handleScroll}
                    scrollEventThrottle={100}
                />

                {showScrollBtn && (
                    <ScrollToBottomButton ref={scrollBtnRef} onPress={scrollToBottom} unreadCount={unreadCount} />
                )}
            </View>
        </ComponentErrorBoundary>
    );
});
