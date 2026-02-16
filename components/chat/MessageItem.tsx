import React, { memo, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, PanResponder, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import MessageStatus from './MessageStatus';
import { Ionicons } from '@expo/vector-icons';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import FlyingReaction from './FlyingReaction';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

interface MessageItemProps {
    message: any;
    isCurrentUser: boolean;
    onLongPress?: (message: any, y: number) => void;
    onReply?: (message: any) => void;
    onReplyClick?: (replyMessage: any) => void;
    onImagePress?: (uri: string) => void;
    friendName?: string;
    flyingEmoji?: any;
}

const MessageItem = memo(({ message, isCurrentUser, onLongPress, onReply, onReplyClick, onImagePress, friendName, flyingEmoji }: MessageItemProps) => {
    const swipeX = useRef(new Animated.Value(0)).current;

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && gestureState.dx > 10;
            },
            onPanResponderGrant: () => {
                // Potential haptic on start of swipe
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dx > 0) {
                    swipeX.setValue(Math.min(gestureState.dx, 100));
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dx > 60) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (onReply) onReply(message);
                }
                Animated.spring(swipeX, {
                    toValue: 0,
                    useNativeDriver: true,
                    friction: 5
                }).start();
            },
        })
    ).current;

    const formatTime = (ts: string) => {
        if (!ts) return '';
        const date = new Date(ts);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const isSystemMsg = message.message?.startsWith('SYSTEM_MSG:');
    if (isSystemMsg) {
        return (
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 16 }}>
                <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 9999, borderWidth: 1, borderColor: '#FDE1D3', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#F68537' }} />
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#B45309', textTransform: 'uppercase', letterSpacing: 1.5, textAlign: 'center' }}>
                        {message.message.replace('SYSTEM_MSG:', '').trim()}
                    </Text>
                </View>
            </View>
        );
    }

    const handleLongPress = (event: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (onLongPress) {
            onLongPress(message, event.nativeEvent.pageY);
        }
    };

    // Media detection logic - Prioritize structured columns
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

    if (isVoiceMessage) {
        if (textContent?.startsWith('[Voice Message]')) {
            textContent = '';
        }
    }

    return (
        <View style={{ position: 'relative', width: '100%', overflow: 'visible' }}>
            <Animated.View
                style={{
                    position: 'absolute',
                    left: 10,
                    top: '40%',
                    opacity: swipeX.interpolate({ inputRange: [30, 60], outputRange: [0, 1] }),
                    transform: [{ scale: swipeX.interpolate({ inputRange: [40, 70], outputRange: [0.8, 1.2], extrapolate: 'clamp' }) }]
                }}
            >
                <Ionicons name="arrow-undo-circle" size={28} color="#F68537" />
            </Animated.View>

            <Animated.View
                {...panResponder.panHandlers}
                style={{
                    transform: [{ translateX: swipeX }],
                    width: '100%',
                    marginBottom: 12,
                    paddingHorizontal: 16,
                    flexDirection: 'column',
                    alignItems: isCurrentUser ? 'flex-end' : 'flex-start'
                }}
            >
                <TouchableOpacity
                    onLongPress={handleLongPress}
                    activeOpacity={0.9}
                    style={{
                        maxWidth: '85%',
                        borderRadius: 20,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 5,
                        overflow: 'hidden',
                        backgroundColor: isCurrentUser ? 'transparent' : 'white',
                        borderTopRightRadius: isCurrentUser ? 4 : 20,
                        borderTopLeftRadius: isCurrentUser ? 20 : 4,
                        borderWidth: isCurrentUser ? 0 : 1.5,
                        borderColor: isCurrentUser ? 'transparent' : '#F9F1E7'
                    }}
                >
                    {isCurrentUser ? (
                        <LinearGradient
                            colors={['#F68537', '#E67527']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                        />
                    ) : null}
                    {/* Group Sender Name */}
                    {!isCurrentUser && message.group_id && (
                        <Text style={{ paddingHorizontal: 12, paddingTop: 8, fontSize: 11, fontWeight: 'bold', color: '#F68537' }}>
                            {message.sender?.username || 'User'}
                        </Text>
                    )}

                    {/* Status Context */}
                    {message.status_context && (
                        <TouchableOpacity
                            onPress={() => { }} // Handle opening status viewer if needed
                            style={{
                                margin: 6,
                                padding: 8,
                                borderRadius: 8,
                                borderLeftWidth: 4,
                                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                borderLeftColor: '#10B981', // Green for status
                                flexDirection: 'row',
                                alignItems: 'center'
                            }}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 11, color: '#10B981', marginBottom: 2 }}>
                                    Status
                                </Text>
                                <Text style={{ fontSize: 12, opacity: 0.8, color: isCurrentUser ? 'white' : '#4B5563' }} numberOfLines={1}>
                                    {message.status_context.media_type === 'text' ? message.status_context.content : 'Media Status'}
                                </Text>
                            </View>
                            {message.status_context.media_type !== 'text' && (
                                <Image
                                    source={{ uri: message.status_context.media_url }}
                                    style={{ width: 40, height: 40, borderRadius: 4, backgroundColor: '#E5E7EB' }}
                                    contentFit="cover"
                                    transition={200}
                                />
                            )}
                        </TouchableOpacity>
                    )}

                    {/* Reply Context */}
                    {message.reply && message.reply.id && !message.status_context && (
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.selectionAsync();
                                onReplyClick?.(message.reply);
                            }}
                            style={{
                                margin: 6,
                                padding: 8,
                                borderRadius: 8,
                                borderLeftWidth: 4,
                                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                borderLeftColor: isCurrentUser ? 'rgba(255, 255, 255, 0.5)' : '#F68537'
                            }}
                        >
                            <Text style={{
                                fontWeight: 'bold',
                                fontSize: 11,
                                color: isCurrentUser ? 'white' : '#F68537'
                            }}>
                                {message.reply.sender_id === message.sender_id ? 'Self' : (friendName || 'Friend')}
                            </Text>
                            <Text style={{
                                fontSize: 12,
                                opacity: 0.8,
                                color: isCurrentUser ? 'white' : '#4B5563'
                            }} numberOfLines={1}>
                                {message.reply.message || 'Media'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Image Content */}
                    {imageUrl && (
                        <TouchableOpacity onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onImagePress?.(imageUrl);
                        }}>
                            <Image
                                source={{ uri: imageUrl }}
                                style={{ width: 256, height: 256, backgroundColor: '#F3F4F6' }}
                                contentFit="cover"
                                transition={400}
                            />
                        </TouchableOpacity>
                    )}

                    {/* Voice Message Content */}
                    {isVoiceMessage && voiceUri && (
                        <VoiceMessagePlayer uri={voiceUri} isCurrentUser={isCurrentUser} />
                    )}

                    <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                        {textContent && textContent.trim() !== '' && !(hasImage && textContent.startsWith('Sent ')) && !(isVoiceMessage && textContent.startsWith('Sent ')) && (
                            <Text style={{
                                fontSize: 15,
                                lineHeight: 22,
                                color: isCurrentUser ? 'white' : '#1F2937'
                            }}>
                                {textContent}
                            </Text>
                        )}

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 }}>
                            <Text style={{
                                fontSize: 10,
                                color: isCurrentUser ? 'rgba(255, 255, 255, 0.7)' : '#9CA3AF'
                            }}>
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
                        style={{
                            marginTop: -10,
                            zIndex: 20,
                            flexDirection: 'row',
                            gap: 4,
                            marginRight: isCurrentUser ? 8 : 0,
                            marginLeft: isCurrentUser ? 0 : 8
                        }}
                    >
                        {Object.entries(message.reactions).map(([emoji, count]: any) => (
                            <View key={emoji} style={{ backgroundColor: 'white', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ fontSize: 12 }}>{emoji}</Text>
                                {count > 1 && <Text style={{ fontSize: 9, fontWeight: 'bold', marginLeft: 4, color: '#6B7280' }}>{count}</Text>}
                            </View>
                        ))}
                    </View>
                )}

                {/* Flying Reaction Layer */}
                {flyingEmoji && flyingEmoji.messageId === message.id && (
                    <FlyingReaction key={flyingEmoji.id} emoji={flyingEmoji.emoji} />
                )}
            </Animated.View>
        </View>
    );
});

export default MessageItem;
