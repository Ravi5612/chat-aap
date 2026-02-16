import React, { useRef, useEffect } from 'react';
import { FlatList, View, Platform, LayoutAnimation, UIManager } from 'react-native';
import MessageItem from './MessageItem';
import ReactionPicker from './ReactionPicker';

interface MessageListProps {
    messages: any[];
    currentUser: any;
    onReply?: (message: any) => void;
    onLongPress?: (message: any, y: number) => void;
    onImagePress?: (uri: string) => void;
    friendName?: string;
    flyingEmoji?: any;
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function MessageList({ messages, currentUser, onReply, onLongPress, onImagePress, friendName, flyingEmoji }: MessageListProps) {
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }, [messages.length]);

    const handleScrollToMessage = (replyMsg: any) => {
        if (!replyMsg?.id) return;
        const index = messages.findIndex(m => m.id === replyMsg.id);
        if (index !== -1) {
            flatListRef.current?.scrollToIndex({
                index,
                animated: true,
                viewPosition: 0.5 // Centers the message
            });
        }
    };

    const renderItem = ({ item }: { item: any }) => (
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

    return (
        <View style={{ flex: 1 }}>
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ paddingVertical: 16 }}
                onContentSizeChange={(w, h) => {
                    // Only scroll to end automatically on big height changes (like new message)
                    // No need for a complex check, scrollToEnd is standard
                    flatListRef.current?.scrollToEnd({ animated: true });
                }}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                showsVerticalScrollIndicator={false}
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
