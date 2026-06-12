import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import FlyingReaction from './FlyingReaction';
import { ComponentErrorBoundary } from '@/components/ui/ComponentErrorBoundary';
import { Buffer } from 'buffer';

import { useMessageMediaCache } from '@/hooks/useMessageMediaCache';
import { useMessageGestures } from '@/hooks/useMessageGestures';
import { useStatusContext } from '@/hooks/useStatusContext';
import { useChatStore } from '@/store/useChatStore';
import MessageStatusContext from './MessageStatusContext';
import MessageContent from './MessageContent';

interface MessageItemProps {
    message: any;
    isCurrentUser: boolean;
    onLongPress?: (message: any, y: number) => void;
    onReply?: (message: any) => void;
    onReplyClick?: (replyMessage: any) => void;
    onImagePress?: (uri: string, isVideo?: boolean) => void;
    friendName?: string;
    flyingEmoji?: any;
    translatedText?: { text: string; lang: string } | null;
    autoListenMode?: boolean;
}

const areEqual = (prevProps: MessageItemProps, nextProps: MessageItemProps) => {
    const prevMsgId = prevProps.message?.id;
    const nextMsgId = nextProps.message?.id;
    return (
        prevProps.message === nextProps.message &&
        prevProps.isCurrentUser === nextProps.isCurrentUser &&
        prevProps.friendName === nextProps.friendName &&
        prevProps.translatedText === nextProps.translatedText &&
        prevProps.autoListenMode === nextProps.autoListenMode &&
        ((prevProps.flyingEmoji?.messageId === prevMsgId) === (nextProps.flyingEmoji?.messageId === nextMsgId)) &&
        (!prevMsgId || prevProps.flyingEmoji?.messageId !== prevMsgId || prevProps.flyingEmoji?.id === nextProps.flyingEmoji?.id)
    );
};

const MessageItemInner = memo(({ message, isCurrentUser, onLongPress, onReply, onReplyClick, onImagePress, friendName, flyingEmoji, translatedText, autoListenMode }: MessageItemProps) => {
    const { panGesture, animatedStyle, iconAnimatedStyle } = useMessageGestures(isCurrentUser, message, onReply);
    const uploadProgress = useChatStore(state => state.uploadProgress[message.id]);

    // Parse Message
    const parsedData = React.useMemo(() => {
        let textContent = message.message || '';
        const isVoiceMessage = message.file_type?.startsWith('audio/') || textContent.startsWith('[Voice Message]');
        const voiceUri = message.file_url || (textContent.startsWith('[Voice Message]') ? textContent.split(' ')[2] : null);
        
        const isVideoMessage = message.file_type === 'video/mp4' || message.file_type?.startsWith('video/') || textContent.startsWith('[Video]');
        let videoUrl = message.file_type?.startsWith('video/') ? message.file_url : null;
        if (!videoUrl && textContent.startsWith('[Video]')) videoUrl = textContent.split(' ')[1];
        
        const hasImage = !isVideoMessage && (message.file_type?.startsWith('image/') || textContent.includes('[Image]') || message.file_url);
        let imageUrl = !isVideoMessage && (message.file_type?.startsWith('image/') || (message.file_url && !message.file_type)) ? message.file_url : null;
        
        if (!imageUrl && textContent.startsWith('[Image]')) {
            const parts = textContent.split(' ');
            imageUrl = parts[1];
            textContent = parts.slice(2).join(' ');
        }
        if (isVideoMessage && textContent.startsWith('[Video]')) textContent = '';
        if (isVoiceMessage && textContent.startsWith('[Voice Message]')) textContent = '';

        const isContactMessage = textContent.startsWith('[Contact]');
        let contactName = '', contactPhone = '';
        if (isContactMessage) {
            const parts = textContent.substring(9).split('|');
            contactName = parts[0]?.trim() || 'Unknown Contact';
            contactPhone = parts[1]?.trim() || '';
            textContent = '';
        }

        const isLocationMessage = textContent.startsWith('[Location]');
        let locationCoords = '', locationAddress = '';
        if (isLocationMessage) {
            const parts = textContent.substring(11).split('|');
            locationCoords = parts[0]?.trim() || '';
            locationAddress = parts[1]?.trim() || 'Shared Location';
            textContent = '';
        }

        const isDocumentMessage = textContent.startsWith('[Document]') || (message.file_url && message.file_type && !message.file_type.startsWith('image/') && !message.file_type.startsWith('audio/') && !message.file_type.startsWith('video/'));
        let documentName = message.file_name || 'Document';
        let documentSize = message.file_size ? `${(message.file_size / 1024 / 1024).toFixed(2)} MB` : '';
        let documentUrl = message.file_url;
        if (textContent.startsWith('[Document]')) {
            const parts = textContent.substring(11).split('|');
            if (!message.file_name) documentName = parts[1]?.trim() || 'Document';
            if (!documentUrl) documentUrl = parts[0]?.trim() || '';
            textContent = '';
        }

        if (translatedText) {
            textContent = translatedText.text;
        }

        return {
            isVoiceMessage, voiceUri, isVideoMessage, videoUrl, hasImage, imageUrl,
            textContent, isContactMessage, contactName, contactPhone,
            isLocationMessage, locationCoords, locationAddress,
            isDocumentMessage, documentName, documentSize, documentUrl
        };
    }, [message.message, message.file_type, message.file_url, message.file_name, message.file_size, translatedText]);

    const customKey = React.useMemo(() => {
        return message.decryptionKeyBase64 ? new Uint8Array(Buffer.from(message.decryptionKeyBase64, 'base64')) : null;
    }, [message.decryptionKeyBase64]);

    const { localImageUrl, localVoiceUrl, localDocumentUrl, imageLoading } = useMessageMediaCache(message, parsedData.imageUrl, parsedData.voiceUri, parsedData.documentUrl, customKey);
    const finalVideoUrl = parsedData.videoUrl || message.file_url || null;
    const { decryptedStatusContent, decryptedStatusMedia } = useStatusContext(message.status_context);

    const formatTime = React.useCallback((ts: string) => {
        if (!ts) return '';
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, []);

    const handleLongPress = React.useCallback((event: any) => {
        onLongPress?.(message, event.nativeEvent.pageY);
    }, [onLongPress, message]);

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

    if (message.message_type === 'info') {
        return (
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 8, paddingHorizontal: 16, width: '100%' }}>
                <View style={{ backgroundColor: '#FEF08A', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, maxWidth: '85%' }}>
                    <Text style={{ fontSize: 11, color: '#A16207', textAlign: 'center' }}>
                        {parsedData.textContent || message.message}
                    </Text>
                </View>
            </View>
        );
    }

    if (message.message_type === 'call_log' || message.file_type === 'call_log') {
        let callData: any = null;
        try {
            callData = JSON.parse(message.message);
        } catch (e) {
            callData = { type: 'call_log', status: 'unknown' };
        }

        const isMissed = callData.status === 'missed';
        const isCancelled = callData.status === 'cancelled';
        const isCompleted = callData.status === 'completed';
        const isVideo = callData.call_type === 'video';
        
        let iconName: any = isVideo ? 'videocam' : 'call';
        let iconColor = '#6B7280'; // Default Grey
        let textColor = '#374151'; // Default Grey
        let bgStyle = { backgroundColor: '#F9FAFB', borderColor: '#F3F4F6' };
        let callText = isVideo ? 'Video call' : 'Voice call';

        if (isMissed) {
            iconColor = '#EF4444'; // Red
            textColor = '#DC2626'; // Dark Red
            bgStyle = { backgroundColor: '#FEF2F2', borderColor: '#FECACA' };
            callText = isCurrentUser ? `Unanswered ${isVideo ? 'video ' : 'voice '}call` : `Missed ${isVideo ? 'video ' : 'voice '}call`;
        } else if (isCancelled) {
            callText = isCurrentUser ? `You cancelled the call` : `${friendName || 'Friend'} cancelled the call`;
        } else if (callData.status === 'rejected') {
            callText = isCurrentUser ? `${friendName || 'Friend'} declined the call` : `You declined the call`;
        } else if (isCompleted) {
            iconColor = '#10B981'; // Green
            textColor = '#059669'; // Dark Green
            bgStyle = { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' };
            
            let durStr = '';
            if (callData.duration) {
                const m = Math.floor(callData.duration / 60);
                const s = callData.duration % 60;
                durStr = `${m}:${s.toString().padStart(2, '0')}`;
            }
            callText = `${isVideo ? 'Video' : 'Voice'} call at ${formatTime(message.created_at)}${durStr ? ` (${durStr})` : ''}`;
        }

        return (
            <View style={{ flexDirection: 'row', justifyContent: isCurrentUser ? 'flex-end' : 'flex-start', marginVertical: 8, paddingHorizontal: 16, width: '100%' }}>
                <View style={{ ...bgStyle, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name={iconName} size={18} color={iconColor} />
                    </View>
                    <View>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: textColor }}>{callText}</Text>
                        {(isMissed || isCancelled || callData.status === 'rejected') && <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{formatTime(message.created_at)}</Text>}
                    </View>
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
                    <View style={{ position: 'relative', maxWidth: '85%' }}>
                        <TouchableOpacity
                            onLongPress={handleLongPress}
                            activeOpacity={0.9}
                            style={{ width: '100%', borderRadius: 18, paddingVertical: 4, paddingHorizontal: 2, backgroundColor: isCurrentUser ? '#F68537' : 'white', borderTopRightRadius: isCurrentUser ? 4 : 18, borderTopLeftRadius: isCurrentUser ? 18 : 4, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1 }}
                        >
                            {!isCurrentUser && message.group_id && <Text style={{ paddingHorizontal: 12, paddingTop: 8, fontSize: 11, fontWeight: 'bold', color: '#F68537' }}>{message.sender?.username || 'User'}</Text>}

                            <MessageStatusContext statusContext={message.status_context} isCurrentUser={isCurrentUser} decryptedStatusContent={decryptedStatusContent} decryptedStatusMedia={decryptedStatusMedia} />

                            {message.reply && message.reply.id && !message.status_context && (() => {
                                const reply = message.reply;
                                const isImg = reply.message_type === 'image' || reply.file_type?.startsWith('image/') || reply.message?.startsWith('[Image]');
                                const isVid = reply.message_type === 'video' || reply.file_type?.startsWith('video/') || reply.message?.startsWith('[Video]');
                                const isAud = reply.message_type === 'audio' || reply.file_type?.startsWith('audio/') || reply.message?.startsWith('[Voice');
                                const isDoc = reply.message_type === 'document' || reply.message?.startsWith('[Document]');
                                const rawMsg = reply.message || '';
                                const isEncryptedOrId = !rawMsg || rawMsg.startsWith('{') || /^\d{8,}$/.test(rawMsg);
                                let previewText = rawMsg;
                                if (isImg) previewText = '📷 Photo';
                                else if (isVid) previewText = '🎥 Video';
                                else if (isAud) previewText = '🎵 Voice message';
                                else if (isDoc) previewText = '📄 Document';
                                else if (isEncryptedOrId) previewText = '💬 Message';

                                // Extract image URL from reply for thumbnail
                                let replyImgUrl = reply.file_url;
                                if (!replyImgUrl && reply.message?.startsWith('[Image]')) {
                                    replyImgUrl = reply.message.split(' ')[1];
                                }

                                return (
                                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); Haptics.selectionAsync(); onReplyClick?.(reply); }} activeOpacity={0.7} style={{ margin: 6, padding: 8, borderRadius: 8, borderLeftWidth: 4, backgroundColor: 'rgba(0, 0, 0, 0.05)', borderLeftColor: isCurrentUser ? 'rgba(255, 255, 255, 0.5)' : '#F68537', flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontWeight: 'bold', fontSize: 11, color: isCurrentUser ? 'white' : '#F68537' }}>{reply.sender_id === message.sender_id ? 'Self' : (friendName || 'Friend')}</Text>
                                            <Text style={{ fontSize: 12, opacity: 0.8, color: isCurrentUser ? 'white' : '#4B5563' }} numberOfLines={4}>{previewText}</Text>
                                        </View>
                                        {/* Thumbnail for image replies */}
                                        {isImg && replyImgUrl ? (
                                            <View style={{ width: 40, height: 40, borderRadius: 6, overflow: 'hidden', marginLeft: 8, backgroundColor: 'rgba(0,0,0,0.1)' }}>
                                                <Image source={{ uri: replyImgUrl }} style={{ width: 40, height: 40 }} contentFit="cover" cachePolicy="memory-disk" />
                                            </View>
                                        ) : isVid ? (
                                            <View style={{ width: 40, height: 40, borderRadius: 6, marginLeft: 8, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                                                <Ionicons name="videocam" size={18} color="white" />
                                            </View>
                                        ) : null}
                                    </TouchableOpacity>
                                );
                            })()}

                            <MessageContent
                                message={message} isCurrentUser={isCurrentUser} formatTime={formatTime} handleLongPress={handleLongPress} onImagePress={onImagePress}
                                imageUrl={parsedData.imageUrl} localImageUrl={localImageUrl} imageLoading={imageLoading} uploadProgress={uploadProgress}
                                isVoiceMessage={parsedData.isVoiceMessage} voiceUri={parsedData.voiceUri} localVoiceUrl={localVoiceUrl} textContent={parsedData.textContent}
                                isContactMessage={parsedData.isContactMessage} contactName={parsedData.contactName} contactPhone={parsedData.contactPhone}
                                isLocationMessage={parsedData.isLocationMessage} locationCoords={parsedData.locationCoords} locationAddress={parsedData.locationAddress}
                                isDocumentMessage={parsedData.isDocumentMessage} documentName={parsedData.documentName} documentSize={parsedData.documentSize} documentUrl={localDocumentUrl || parsedData.documentUrl}
                                hasImage={parsedData.hasImage}
                                isVideoMessage={parsedData.isVideoMessage} videoUrl={finalVideoUrl}
                            />
                        </TouchableOpacity>

                        {/* Auto-Listen Speaker Icon */}
                        {autoListenMode && (
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    const rawText = message?.message || '';
                                    const cleanText = rawText
                                        .replace(/\[Image\]\s*\S+/g, 'Image')
                                        .replace(/\[Video\]\s*\S+/g, 'Video')
                                        .replace(/\[Voice Message\]\s*\S+/g, 'Voice Message')
                                        .replace(/\[Document\][^|]+\|?[^|]*/g, 'Document')
                                        .replace(/\[Contact\][^|]+\|?[^|]*/g, 'Contact')
                                        .replace(/\[Location\][^|]+\|?[^|]*/g, 'Location')
                                        .trim();
                                    if (!cleanText) return;
                                    const isHindi = /[\u0900-\u097F]/.test(cleanText);
                                    Speech.isSpeakingAsync().then(speaking => {
                                        if (speaking) { Speech.stop(); }
                                        else {
                                            Speech.speak(cleanText, {
                                                language: isHindi ? 'hi-IN' : 'en-US',
                                                pitch: 1.0, rate: 0.9,
                                            });
                                        }
                                    });
                                }}
                                style={{
                                    position: 'absolute',
                                    bottom: -10,
                                    [isCurrentUser ? 'left' : 'right']: -10,
                                    width: 28, height: 28, borderRadius: 14,
                                    backgroundColor: '#F68537',
                                    alignItems: 'center', justifyContent: 'center',
                                    elevation: 3,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.2, shadowRadius: 3,
                                    borderWidth: 2,
                                    borderColor: 'white'
                                }}
                            >
                                <Ionicons name="volume-high" size={14} color="white" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {message.reactions && Object.keys(message.reactions).length > 0 && (
                        <View style={{ marginTop: -10, zIndex: 20, flexDirection: 'row', gap: 4, marginRight: isCurrentUser ? 8 : 0, marginLeft: isCurrentUser ? 0 : 8 }}>
                            {(() => {
                                const aggregated: Record<string, number> = {};
                                Object.entries(message.reactions).forEach(([key, value]) => {
                                    if (key.length === 36) {
                                        aggregated[value as string] = (aggregated[value as string] || 0) + 1;
                                    } else {
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
