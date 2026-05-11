import React, { memo, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, PanResponder, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import MessageStatus from './MessageStatus';
import { Ionicons } from '@expo/vector-icons';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import FlyingReaction from './FlyingReaction';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import { getMediaCache, saveMediaCache } from '@/lib/localDb';
import { useDbStore } from '@/store/useDbStore';
import { useState, useEffect } from 'react';

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
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                // Ensure horizontal swipe takes priority over vertical scroll and child presses
                return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 15;
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
    
    const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
    const [localVoiceUrl, setLocalVoiceUrl] = useState<string | null>(null);

    const formatTime = (ts: string) => {
        if (!ts) return '';
        const date = new Date(ts);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };



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

    // Call Log detection
    const isCallLog = message.message_type === 'call' || !!message.call_details;
    const callDetails = message.call_details || {};

    // Media Caching Logic
    useEffect(() => {
        const handleMediaCache = async () => {
            const { db } = useDbStore.getState();
            if (!db) return;

            // Handle Image Caching
            if (imageUrl && !imageUrl.startsWith('file://')) {
                const cached = await getMediaCache(db, imageUrl);
                if (cached) {
                    setLocalImageUrl(cached);
                } else {
                    try {
                        const filename = (typeof imageUrl === 'string' ? imageUrl.split('/').pop() : null) || 'media.jpg';
                        const localUri = `${FileSystem.cacheDirectory}${filename}`;
                        const download = await FileSystem.downloadAsync(imageUrl, localUri);
                        if (download.status === 200) {
                            await saveMediaCache(db, imageUrl, download.uri, 'image');
                            setLocalImageUrl(download.uri);
                        }
                    } catch (e) {
                        console.error('[CACHE] Image download failed:', e);
                    }
                }
            }

            // Handle Voice Caching
            if (voiceUri && !voiceUri.startsWith('file://')) {
                const cached = await getMediaCache(db, voiceUri);
                if (cached) {
                    setLocalVoiceUrl(cached);
                } else {
                    try {
                        const filename = (typeof voiceUri === 'string' ? voiceUri.split('/').pop() : null) || 'voice.m4a';
                        const localUri = `${FileSystem.cacheDirectory}${filename}`;
                        const download = await FileSystem.downloadAsync(voiceUri, localUri);
                        if (download.status === 200) {
                            await saveMediaCache(db, voiceUri, download.uri, 'audio');
                            setLocalVoiceUrl(download.uri);
                        }
                    } catch (e) {
                        console.error('[CACHE] Voice download failed:', e);
                    }
                }
            }
        };

        handleMediaCache();
    }, [imageUrl, voiceUri]);

    const isSystemMsg = message.message?.startsWith('SYSTEM_MSG:');

    // Contact detection
    const isContactMessage = textContent?.startsWith('[Contact]');
    let contactName = '';
    let contactPhone = '';
    if (isContactMessage) {
        const parts = textContent!.substring(9).split('|');
        contactName = parts[0]?.trim() || 'Unknown Contact';
        contactPhone = parts[1]?.trim() || '';
        textContent = ''; // Hide raw text
    }

    // Location detection
    const isLocationMessage = textContent?.startsWith('[Location]');
    let locationCoords = '';
    let locationAddress = '';
    if (isLocationMessage) {
        const parts = textContent!.substring(11).split('|');
        locationCoords = parts[0]?.trim() || '';
        locationAddress = parts[1]?.trim() || 'Shared Location';
        textContent = ''; // Hide raw text
    }

    // Document detection
    const isDocumentMessage = textContent?.startsWith('[Document]') || (message.file_url && message.file_type && !message.file_type.startsWith('image/') && !message.file_type.startsWith('audio/'));
    let documentName = message.file_name || 'Document';
    let documentSize = message.file_size ? `${(message.file_size / 1024 / 1024).toFixed(2)} MB` : '';
    let documentUrl = message.file_url;
    
    if (textContent?.startsWith('[Document]')) {
        const parts = textContent.substring(11).split('|');
        if (!message.file_name) documentName = parts[1]?.trim() || 'Document';
        if (!documentUrl) documentUrl = parts[0]?.trim() || '';
        textContent = ''; // Hide raw text
    }

    if (isSystemMsg) {
        return (
            <View style={{ 
                flexDirection: 'row', 
                justifyContent: isCurrentUser ? 'flex-end' : 'flex-start', 
                marginVertical: 4,
                paddingHorizontal: 16,
                width: '100%'
            }}>
                <View style={{ 
                    backgroundColor: isCurrentUser ? '#FFF7ED' : '#F9FAFB', 
                    paddingHorizontal: 14, 
                    paddingVertical: 8, 
                    borderRadius: 12, 
                    borderWidth: 1, 
                    borderColor: isCurrentUser ? '#FFEDD5' : '#F3F4F6',
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    gap: 8,
                    maxWidth: '85%',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 1,
                    elevation: 1
                }}>
                    <Ionicons name="ban-outline" size={16} color={isCurrentUser ? '#F97316' : '#6B7280'} />
                    <Text style={{ 
                        fontSize: 12, 
                        fontWeight: '700', 
                        color: isCurrentUser ? '#C2410C' : '#374151',
                        fontStyle: 'italic'
                    }}>
                        {isCurrentUser ? 'You deleted this message' : 'This message was deleted'}
                    </Text>
                </View>
            </View>
        );
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
                        borderRadius: 18,
                        paddingVertical: 4,
                        paddingHorizontal: 2,
                        backgroundColor: isCurrentUser ? '#F68537' : 'white',
                        borderTopRightRadius: isCurrentUser ? 4 : 18,
                        borderTopLeftRadius: isCurrentUser ? 18 : 4,
                        elevation: 1,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.1,
                        shadowRadius: 1,
                    }}
                >
                    {/* Group Sender Name */}
                    {!isCurrentUser && message.group_id && (
                        <Text style={{ paddingHorizontal: 12, paddingTop: 8, fontSize: 11, fontWeight: 'bold', color: '#F68537' }}>
                            {message.sender?.username || 'User'}
                        </Text>
                    )}

                    {/* Status Context */}
                    {message.status_context && (
                        <View
                            style={{
                                margin: 6,
                                padding: 8,
                                borderRadius: 8,
                                borderLeftWidth: 3,
                                backgroundColor: isCurrentUser ? 'rgba(0, 0, 0, 0.1)' : 'rgba(246, 133, 55, 0.05)',
                                borderLeftColor: '#10B981',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 10,
                                minWidth: 200
                            }}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontWeight: '900', fontSize: 10, color: '#10B981', marginBottom: 2, textTransform: 'uppercase' }}>
                                    Status
                                </Text>
                                <Text style={{ fontSize: 12, color: isCurrentUser ? 'rgba(255, 255, 255, 0.9)' : '#4B5563' }} numberOfLines={2}>
                                    {message.status_context.media_type === 'text' ? message.status_context.content : (message.status_context.caption || 'Media Status')}
                                </Text>
                            </View>
                            {message.status_context.media_type !== 'text' && (
                                <Image
                                    source={{ uri: message.status_context.media_url }}
                                    style={{ width: 44, height: 44, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.1)' }}
                                    contentFit="cover"
                                />
                            )}
                        </View>
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
                            onImagePress?.(localImageUrl || imageUrl);
                        }}>
                            <Image
                                source={{ uri: localImageUrl || imageUrl }}
                                style={{ width: 256, height: 256, backgroundColor: '#F3F4F6' }}
                                contentFit="cover"
                                transition={400}
                            />
                        </TouchableOpacity>
                    )}

                    {/* Voice Message Content */}
                    {isVoiceMessage && (localVoiceUrl || voiceUri) && (
                        <VoiceMessagePlayer uri={localVoiceUrl || voiceUri} isCurrentUser={isCurrentUser} />
                    )}

                    {/* Call Log Content */}
                    {isCallLog && (
                        <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 180 }}>
                            <View style={{ 
                                width: 40, 
                                height: 40, 
                                borderRadius: 20, 
                                backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : 'rgba(246, 133, 55, 0.1)', 
                                alignItems: 'center', 
                                justifyContent: 'center' 
                            }}>
                                <Ionicons 
                                    name={callDetails.type === 'video' ? "videocam" : "call"} 
                                    size={20} 
                                    color={isCurrentUser ? 'white' : '#F68537'} 
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ 
                                    fontSize: 14, 
                                    fontWeight: 'bold', 
                                    color: isCurrentUser ? 'white' : '#1F2937' 
                                }}>
                                    {callDetails.status === 'missed' ? 'Missed Call' : 
                                     callDetails.type === 'video' ? 'Video Call' : 'Audio Call'}
                                </Text>
                                <Text style={{ 
                                    fontSize: 12, 
                                    color: isCurrentUser ? 'rgba(255,255,255,0.8)' : '#6B7280',
                                    marginTop: 2
                                }}>
                                    {callDetails.status === 'completed' ? 
                                        (callDetails.duration > 0 ? `Duration: ${Math.floor(callDetails.duration / 60)}m ${callDetails.duration % 60}s` : 'Call Ended') 
                                        : 'No answer'}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Contact Card Content */}
                    {isContactMessage && (
                        <View style={{ padding: 12, width: 220 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : '#E5E7EB' }}>
                                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                    <Ionicons name="person" size={20} color={isCurrentUser ? 'white' : '#9CA3AF'} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: isCurrentUser ? 'white' : '#1F2937' }} numberOfLines={1}>{contactName}</Text>
                                    <Text style={{ fontSize: 12, color: isCurrentUser ? 'rgba(255,255,255,0.8)' : '#6B7280' }}>Contact</Text>
                                </View>
                            </View>
                            <TouchableOpacity 
                                onPress={() => {
                                    import('react-native').then(({ Linking }) => {
                                        Linking.openURL(`tel:${contactPhone}`);
                                    });
                                }}
                                style={{ alignItems: 'center', paddingVertical: 4 }}
                            >
                                <Text style={{ color: isCurrentUser ? 'white' : '#F68537', fontWeight: 'bold', fontSize: 14 }}>Call {contactPhone}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Location Card Content */}
                    {isLocationMessage && (
                        <View style={{ padding: 12, width: 220 }}>
                            <View style={{ 
                                flexDirection: 'row', 
                                alignItems: 'center', 
                                marginBottom: 12, 
                                paddingBottom: 12, 
                                borderBottomWidth: 1, 
                                borderBottomColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : '#E5E7EB' 
                            }}>
                                <View style={{ 
                                    width: 40, 
                                    height: 40, 
                                    borderRadius: 20, 
                                    backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : 'rgba(16, 185, 129, 0.1)', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    marginRight: 12 
                                }}>
                                    <Ionicons name="location" size={20} color={isCurrentUser ? 'white' : '#10B981'} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: isCurrentUser ? 'white' : '#1F2937' }} numberOfLines={1}>Location</Text>
                                    <Text style={{ fontSize: 12, color: isCurrentUser ? 'rgba(255,255,255,0.8)' : '#6B7280' }} numberOfLines={2}>{locationAddress}</Text>
                                </View>
                            </View>
                            <TouchableOpacity 
                                onPress={() => {
                                    import('react-native').then(({ Linking }) => {
                                        Linking.openURL(`https://maps.google.com/?q=${locationCoords}`);
                                    });
                                }}
                                style={{ alignItems: 'center', paddingVertical: 4 }}
                            >
                                <Text style={{ color: isCurrentUser ? 'white' : '#10B981', fontWeight: 'bold', fontSize: 14 }}>View on Map</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Document Card Content */}
                    {isDocumentMessage && (
                        <View style={{ padding: 12, width: 240 }}>
                            <View style={{ 
                                flexDirection: 'row', 
                                alignItems: 'center', 
                                marginBottom: 12, 
                                paddingBottom: 12, 
                                borderBottomWidth: 1, 
                                borderBottomColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : '#E5E7EB' 
                            }}>
                                <View style={{ 
                                    width: 44, 
                                    height: 44, 
                                    borderRadius: 12, 
                                    backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : 'rgba(124, 58, 237, 0.1)', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    marginRight: 12 
                                }}>
                                    <Ionicons name="document-text" size={24} color={isCurrentUser ? 'white' : '#7C3AED'} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: isCurrentUser ? 'white' : '#1F2937' }} numberOfLines={2}>{documentName}</Text>
                                    {documentSize ? (
                                        <Text style={{ fontSize: 12, color: isCurrentUser ? 'rgba(255,255,255,0.8)' : '#6B7280', marginTop: 2 }}>{documentSize}</Text>
                                    ) : null}
                                </View>
                            </View>
                            <TouchableOpacity 
                                onPress={() => {
                                    if (documentUrl) {
                                        import('react-native').then(({ Linking }) => {
                                            Linking.openURL(documentUrl);
                                        });
                                    }
                                }}
                                disabled={!documentUrl || message.status === 'sending'}
                                style={{ alignItems: 'center', paddingVertical: 4 }}
                            >
                                <Text style={{ color: isCurrentUser ? 'white' : '#7C3AED', fontWeight: 'bold', fontSize: 14 }}>
                                    {message.status === 'sending' ? 'Uploading...' : 'Open Document'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                        {textContent && textContent.trim() !== '' && !(hasImage && textContent.startsWith('Sent ')) && !(isVoiceMessage && textContent.startsWith('Sent ')) && (
                            <Text style={{
                                fontSize: 15,
                                lineHeight: 22,
                                color: isCurrentUser ? 'white' : '#1F2937',
                                fontStyle: (textContent && typeof textContent === 'string' && (textContent.trim().startsWith('{"iv":') || textContent === 'SYSTEM_MSG: DELETED')) ? 'italic' : 'normal',
                                opacity: (textContent && typeof textContent === 'string' && (textContent.trim().startsWith('{"iv":') || textContent === 'SYSTEM_MSG: DELETED')) ? 0.7 : 1
                            }}>
                                {textContent && textContent.trim && textContent.trim().startsWith('{"iv":') 
                                    ? 'Decrypting...' 
                                    : (textContent === 'SYSTEM_MSG: DELETED' ? '🚫 This message was deleted' : textContent)}
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
