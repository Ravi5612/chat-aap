import React, { useRef, useState } from 'react';
import { FlatList, View, Platform } from 'react-native';
import MessageItem from './MessageItem';
import ReactionPicker from './ReactionPicker';

interface MessageListProps {
    messages: any[];
    currentUser: any;
    onReply?: (message: any) => void;
    onLongPress?: (message: any, y: number) => void;
    onImagePress?: (uri: string) => void;
    friendName?: string;
}

export default function MessageList({ messages, currentUser, onReply, onLongPress, onImagePress, friendName }: MessageListProps) {
    const flatListRef = useRef<FlatList>(null);

    const renderItem = ({ item }: { item: any }) => (
        <MessageItem
            message={item}
            isCurrentUser={item.sender_id === currentUser?.id}
            onLongPress={onLongPress}
            onReplyClick={onReply}
            onImagePress={onImagePress}
            friendName={friendName}
        />
    );

    return (
        <View className="flex-1">
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ paddingVertical: 16 }}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                showsVerticalScrollIndicator={false}
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews={Platform.OS === 'android'}
            />
        </View>
    );
}
