import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import FlyingReaction from './FlyingReaction';
import { ComponentErrorBoundary } from '@/components/ui/ComponentErrorBoundary';

import { useMessageMediaCache } from '@/hooks/useMessageMediaCache';
import { useMessageGestures } from '@/hooks/useMessageGestures';
import { useStatusContext } from '@/hooks/useStatusContext';
import MessageStatusContext from './MessageStatusContext';
import MessageContent from './MessageContent';

interface MessageItemProps {
    message: any;
    isCurrentUser: boolean;
    onLongPress?: (message: any, y: number) => void;
    onReply?: (message: any) => void;
    onReplyClick?: (replyMessage: any) => void;
    onImagePress?: (uri: string) => void;
    friendName?: string;
    flyingEmoji?: any;
    uploadProgress?: number;
}

const areEqual = (prevProps: MessageItemProps, nextProps: MessageItemProps) => {
    const prevMsgId = prevProps.message?.id;
    const nextMsgId = nextProps.message?.id;
    return (
        prevProps.message === nextProps.message &&
        prevProps.isCurrentUser === nextProps.isCurrentUser &&
        prevProps.friendName === nextProps.friendName &&
        ((prevProps.flyingEmoji?.messageId === prevMsgId) === (nextProps.flyingEmoji?.messageId === nextMsgId)) &&
        (!prevMsgId || prevProps.flyingEmoji?.messageId !== prevMsgId || prevProps.flyingEmoji?.id === nextProps.flyingEmoji?.id) &&
        prevProps.uploadProgress === nextProps.uploadProgress
    );
};

const MessageItemInner = memo(({ message, isCurrentUser, onLongPress, onReply, onReplyClick, onImagePress, friendName, flyingEmoji, uploadProgress }: MessageItemProps) => {
    const { panGesture, animatedStyle, iconAnimatedStyle } = useMessageGestures(isCurrentUser, message, onReply);

    // Parse Message
    const isVoiceMessage = message.file_type?.startsWith('audio/') || message.message?.startsWith('[Voice Message]');
    const voiceUri = message.file_url || (message.message?.startsWith('[Voice Message]') ? message.message.split(' ')[2] : null);
    const hasImage = message.file_type?.startsWith('image/') || message.message?.includes('[Image]') || message.file_url;
    let imageUrl = (message.file_type?.startsWith('image/') || (message.file_url && !message.file_type)) ? message.file_url : null;
    let textContent = message.message;

    if (!imageUrl && textContent?.startsWith('[Image]')) {
        const parts = textContent.split(' ');
        imageUrl = parts[1];
        textContent = parts.slice(2).join(' ');
    }

    if (isVoiceMessage && textContent?.startsWith('[Voice Message]')) textContent = '';

    const isContactMessage = textContent?.startsWith('[Contact]');
    let contactName = '', contactPhone = '';
    if (isContactMessage) {
        const parts = textContent!.substring(9).split('|');
        contactName = parts[0]?.trim() || 'Unknown Contact';
        contactPhone = parts[1]?.trim() || '';
        textContent = '';
    }

    const isLocationMessage = textContent?.startsWith('[Location]');
    let locationCoords = '', locationAddress = '';
    if (isLocationMessage) {
        const parts = textContent!.substring(11).split('|');
        locationCoords = parts[0]?.trim() || '';
        locationAddress = parts[1]?.trim() || 'Shared Location';
        textContent = '';
    }

    const isDocumentMessage = textContent?.startsWith('[Document]') || (message.file_url && message.file_type && !message.file_type.startsWith('image/') && !message.file_type.startsWith('audio/'));
    let documentName = message.file_name || 'Document';
    let documentSize = message.file_size ? `${(message.file_size / 1024 / 1024).toFixed(2)} MB` : '';
    let documentUrl = message.file_url;
    if (textContent?.startsWith('[Document]')) {
        const parts = textContent.substring(11).split('|');
        if (!message.file_name) documentName = parts[1]?.trim() || 'Document';
        if (!documentUrl) documentUrl = parts[0]?.trim() || '';
        textContent = '';
    }

    const { localImageUrl, localVoiceUrl, localDocumentUrl, imageLoading } = useMessageMediaCache(message, imageUrl, voiceUri, documentUrl);
    const { decryptedStatusContent, decryptedStatusMedia } = useStatusContext(message.status_context);

    const formatTime = (ts: string) => {
        if (!ts) return '';
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleLongPress = (event: any) => onLongPress?.(message, event.nativeEvent.pageY);

    const isSystemMsg = message.message?.startsWith('SYSTEM_MSG:');
    if (isSystemMsg) {
        const isScreenshot = message.message === 'SYSTEM_MSG: SCREENSHOT_TAKEN';
        return (
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 12, paddingHorizontal: 16, width: '100%' }}>
                <View style={{ backgroundColor: isScreenshot ? '#FEF2F2' : (isCurrentUser ? '#FFF7ED' : '#F9FAFB'), paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: isScreenshot ? '#FECACA' : (isCurrentUser ? '#FFEDD5' : '#F3F4F6'), flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 }}>
                    <Ionicons name={isScreenshot ? "scan-outline" : "ban-outline"} size={16} color={isScreenshot ? '#EF4444' : (isCurrentUser ? '#F97316' : '#6B7280')} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: isScreenshot ? '#DC2626' : (isCurrentUser ? '#C2410C' : '#374151'), fontStyle: 'italic' }}>
                        {isScreenshot ? (isCurrentUser ? 'You took a screenshot' : 'Screenshot taken by friend') : (isCurrentUser ? 'You deleted this message' : 'This message was deleted')}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={{ position: 'relative', width: '100%', overflow: 'visible' }}>
            <Animated.View style={[{ position: 'absolute', top: '40%', ...(isCurrentUser ? { right: 10 } : { left: 10 }) }, iconAnimatedStyle]}>
                <Ionicons name="arrow-undo-circle" size={28} color="#F68537" />
            </Animated.View>

            <GestureDetector gesture={panGesture}>
                <Animated.View style={[{ width: '100%', marginBottom: 12, paddingHorizontal: 16, flexDirection: 'column', alignItems: isCurrentUser ? 'flex-end' : 'flex-start' }, animatedStyle]}>
                    <TouchableOpacity
                        onLongPress={handleLongPress}
                        activeOpacity={0.9}
                        style={{ maxWidth: '85%', borderRadius: 18, paddingVertical: 4, paddingHorizontal: 2, backgroundColor: isCurrentUser ? '#F68537' : 'white', borderTopRightRadius: isCurrentUser ? 4 : 18, borderTopLeftRadius: isCurrentUser ? 18 : 4, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1 }}
                    >
                        {!isCurrentUser && message.group_id && <Text style={{ paddingHorizontal: 12, paddingTop: 8, fontSize: 11, fontWeight: 'bold', color: '#F68537' }}>{message.sender?.username || 'User'}</Text>}

                        <MessageStatusContext statusContext={message.status_context} isCurrentUser={isCurrentUser} decryptedStatusContent={decryptedStatusContent} decryptedStatusMedia={decryptedStatusMedia} />

                        {message.reply && message.reply.id && !message.status_context && (
                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); Haptics.selectionAsync(); onReplyClick?.(message.reply); }} activeOpacity={0.7} style={{ margin: 6, padding: 8, borderRadius: 8, borderLeftWidth: 4, backgroundColor: 'rgba(0, 0, 0, 0.05)', borderLeftColor: isCurrentUser ? 'rgba(255, 255, 255, 0.5)' : '#F68537' }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 11, color: isCurrentUser ? 'white' : '#F68537' }}>{message.reply.sender_id === message.sender_id ? 'Self' : (friendName || 'Friend')}</Text>
                                <Text style={{ fontSize: 12, opacity: 0.8, color: isCurrentUser ? 'white' : '#4B5563' }} numberOfLines={1}>{message.reply.message || 'Media'}</Text>
                            </TouchableOpacity>
                        )}

                        <MessageContent
                            message={message} isCurrentUser={isCurrentUser} formatTime={formatTime} handleLongPress={handleLongPress} onImagePress={onImagePress}
                            imageUrl={imageUrl} localImageUrl={localImageUrl} imageLoading={imageLoading} uploadProgress={uploadProgress}
                            isVoiceMessage={isVoiceMessage} voiceUri={voiceUri} localVoiceUrl={localVoiceUrl} textContent={textContent}
                            isContactMessage={isContactMessage} contactName={contactName} contactPhone={contactPhone}
                            isLocationMessage={isLocationMessage} locationCoords={locationCoords} locationAddress={locationAddress}
                            isDocumentMessage={isDocumentMessage} documentName={documentName} documentSize={documentSize} documentUrl={localDocumentUrl || documentUrl}
                            hasImage={hasImage}
                        />
                    </TouchableOpacity>

                    {message.reactions && Object.keys(message.reactions).length > 0 && (
                        <View style={{ marginTop: -10, zIndex: 20, flexDirection: 'row', gap: 4, marginRight: isCurrentUser ? 8 : 0, marginLeft: isCurrentUser ? 0 : 8 }}>
                            {(() => {
                                const aggregated: Record<string, number> = {};
                                Object.entries(message.reactions).forEach(([key, value]) => {
                                    if (key.length === 36) {
                                        // new format: key = userId, value = emoji
                                        aggregated[value as string] = (aggregated[value as string] || 0) + 1;
                                    } else {
                                        // old format: key = emoji, value = count
                                        aggregated[key] = (aggregated[key] || 0) + (value as number);
                                    }
                                });
                                return Object.entries(aggregated).map(([emoji, count]) => (
                                    <View key={emoji} style={{ backgroundColor: 'white', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 12 }}>{emoji}</Text>
                                        {count > 1 && <Text style={{ fontSize: 9, fontWeight: 'bold', marginLeft: 4, color: '#6B7280' }}>{count}</Text>}
                                    </View>
                                ));
                            })()}
                        </View>
                    )}

                    {flyingEmoji && flyingEmoji.messageId === message.id && <FlyingReaction key={flyingEmoji.id} emoji={flyingEmoji.emoji} />}
                </Animated.View>
            </GestureDetector>
        </View>
    );
}, areEqual);

export default function MessageItem(props: MessageItemProps) {
    return <ComponentErrorBoundary fallbackName={`Message Bubble`}><MessageItemInner {...props} /></ComponentErrorBoundary>;
}
