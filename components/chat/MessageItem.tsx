import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import MessageStatus from './MessageStatus';
import { Ionicons } from '@expo/vector-icons';

interface MessageItemProps {
    message: any;
    isCurrentUser: boolean;
    onLongPress?: (message: any, y: number) => void;
    onReplyClick?: (replyMessage: any) => void;
    onImagePress?: (uri: string) => void;
    friendName?: string;
}

const MessageItem = memo(({ message, isCurrentUser, onLongPress, onReplyClick, onImagePress, friendName }: MessageItemProps) => {
    const formatTime = (ts: string) => {
        if (!ts) return '';
        const date = new Date(ts);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const isSystemMsg = message.message?.startsWith('SYSTEM_MSG:');
    if (isSystemMsg) {
        return (
            <View className="flex-row justify-center my-4">
                <View className="bg-gray-100/80 px-4 py-1.5 rounded-full border border-gray-200">
                    <Text className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">
                        <Ionicons name="information-circle-outline" size={10} color="#94A3B8" /> {message.message.replace('SYSTEM_MSG:', '').trim()}
                    </Text>
                </View>
            </View>
        );
    }

    const handleLongPress = (event: any) => {
        if (onLongPress) {
            onLongPress(message, event.nativeEvent.pageY);
        }
    };

    // Image detection logic
    const hasImage = message.message?.includes('[Image]') || message.file_url;
    let imageUrl = message.file_url;
    let textContent = message.message;

    if (textContent?.startsWith('[Image]')) {
        const parts = textContent.split(' ');
        imageUrl = parts[1];
        textContent = parts.slice(2).join(' ');
    }

    return (
        <View className={`w-full mb-3 px-4 flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
            <TouchableOpacity
                onLongPress={handleLongPress}
                activeOpacity={0.9}
                className={`max-w-[85%] rounded-2xl shadow-sm overflow-hidden ${isCurrentUser
                    ? 'bg-[#F68537] rounded-tr-none'
                    : 'bg-white border border-gray-100 rounded-tl-none'
                    }`}
            >
                {/* Group Sender Name */}
                {!isCurrentUser && message.group_id && (
                    <Text className="px-3 pt-2 text-[11px] font-bold text-[#F68537]">
                        {message.sender?.username || 'User'}
                    </Text>
                )}

                {/* Reply Context */}
                {message.reply && (
                    <TouchableOpacity
                        onPress={() => onReplyClick?.(message.reply)}
                        className={`m-1.5 p-2 rounded-lg border-l-4 bg-black/5 ${isCurrentUser ? 'border-white/50' : 'border-[#F68537]'}`}
                    >
                        <Text className={`font-bold text-[11px] ${isCurrentUser ? 'text-white' : 'text-[#F68537]'}`}>
                            {message.reply.sender_id === message.sender_id ? 'Self' : (friendName || 'Friend')}
                        </Text>
                        <Text className={`text-xs opacity-80 ${isCurrentUser ? 'text-white' : 'text-gray-600'}`} numberOfLines={1}>
                            {message.reply.message || 'Media'}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Image Content */}
                {imageUrl && (
                    <TouchableOpacity onPress={() => onImagePress?.(imageUrl)}>
                        <Image source={{ uri: imageUrl }} className="w-64 h-64 bg-gray-100" resizeMode="cover" />
                    </TouchableOpacity>
                )}

                <View className="px-3 py-2">
                    {textContent && textContent.trim() !== '' && (
                        <Text className={`text-[15px] leading-relaxed ${isCurrentUser ? 'text-white' : 'text-gray-800'}`}>
                            {textContent}
                        </Text>
                    )}

                    <View className="flex-row items-center justify-end mt-1">
                        <Text className={`text-[10px] ${isCurrentUser ? 'text-white/70' : 'text-gray-400'}`}>
                            {formatTime(message.created_at)}
                        </Text>
                        {isCurrentUser && (
                            <MessageStatus status={message.status || 'sent'} />
                        )}
                    </View>
                </View>
            </TouchableOpacity>

            {/* Reactions Overlay */}
            {message.reactions && Object.keys(message.reactions).length > 0 && (
                <View
                    style={{ marginTop: -10, zIndex: 20 }}
                    className={`flex-row gap-1 ${isCurrentUser ? 'mr-2' : 'ml-2'}`}
                >
                    {Object.entries(message.reactions).map(([emoji, count]: any) => (
                        <View key={emoji} className="bg-white px-2 py-0.5 rounded-full border border-gray-100 shadow-sm flex-row items-center">
                            <Text className="text-xs">{emoji}</Text>
                            {count > 1 && <Text className="text-[9px] font-bold ml-1 text-gray-500">{count}</Text>}
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
});

export default MessageItem;
