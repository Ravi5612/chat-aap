import { getMediaCache, saveMediaCache } from '@/lib/localDb';
import { useDbStore } from '@/store/useDbStore';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { memo, useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withSpring, 
    runOnJS,
    interpolate,
    Extrapolation
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import FlyingReaction from './FlyingReaction';
import MessageStatus from './MessageStatus';
import VoiceMessagePlayer from './VoiceMessagePlayer';

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

const areEqual = (prevProps: MessageItemProps, nextProps: MessageItemProps) => {
    const prevMsgId = prevProps.message?.id;
    const nextMsgId = nextProps.message?.id;
    return (
        prevProps.message === nextProps.message &&
        prevProps.isCurrentUser === nextProps.isCurrentUser &&
        prevProps.friendName === nextProps.friendName &&
        // Check if flyingEmoji relevancy changed for this message
        ((prevProps.flyingEmoji?.messageId === prevMsgId) ===
            (nextProps.flyingEmoji?.messageId === nextMsgId)) &&
        // If it was and still is relevant, verify ID hasn't changed
        (!prevMsgId || prevProps.flyingEmoji?.messageId !== prevMsgId ||
            prevProps.flyingEmoji?.id === nextProps.flyingEmoji?.id)
    );
};

const MessageItem = memo(({ message, isCurrentUser, onLongPress, onReply, onReplyClick, onImagePress, friendName, flyingEmoji }: MessageItemProps) => {
    const router = useRouter();
    const swipeX = useSharedValue(0);
    const hasVibrated = useSharedValue(false);

    const panGesture = Gesture.Pan()
        .activeOffsetX(isCurrentUser ? [-15, 0] : [0, 15]) // Left swipe for me, right swipe for friend
        .onUpdate((event) => {
            if (isCurrentUser) {
                // Swipe left (negative translationX)
                if (event.translationX < 0) {
                    swipeX.value = Math.max(event.translationX, -100);
                    
                    if (swipeX.value < -60 && !hasVibrated.value) {
                        hasVibrated.value = true;
                        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
                    } else if (swipeX.value >= -60 && hasVibrated.value) {
                        hasVibrated.value = false;
                    }
                } else {
                    swipeX.value = 0;
                }
            } else {
                // Swipe right (positive translationX)
                if (event.translationX > 0) {
                    swipeX.value = Math.min(event.translationX, 100);
                    
                    if (swipeX.value > 60 && !hasVibrated.value) {
                        hasVibrated.value = true;
                        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
                    } else if (swipeX.value <= 60 && hasVibrated.value) {
                        hasVibrated.value = false;
                    }
                } else {
                    swipeX.value = 0;
                }
            }
        })
        .onEnd((event) => {
            const triggered = isCurrentUser ? (event.translationX < -60) : (event.translationX > 60);
            if (triggered) {
                if (onReply) {
                    runOnJS(onReply)(message);
                }
            }
            swipeX.value = withSpring(0, { damping: 15, stiffness: 150 });
            hasVibrated.value = false;
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: swipeX.value }],
    }));

    const iconAnimatedStyle = useAnimatedStyle(() => {
        const absSwipeX = Math.abs(swipeX.value);
        const opacity = interpolate(
            absSwipeX,
            [30, 60],
            [0, 1],
            Extrapolation.CLAMP
        );
        const scale = interpolate(
            absSwipeX,
            [40, 70],
            [0.8, 1.2],
            Extrapolation.CLAMP
        );
        return {
            opacity,
            transform: [{ scale }],
        };
    });

    const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
    const [localVoiceUrl, setLocalVoiceUrl] = useState<string | null>(null);
    const [decryptedStatusContent, setDecryptedStatusContent] = useState<string | null>(null);
    const [decryptedStatusMedia, setDecryptedStatusMedia] = useState<string | null>(null);

    // ✅ Decrypt status_context content when message has a status reply
    useEffect(() => {
        const decryptStatusContext = async () => {
            if (!message.status_context) return;
            const ctx = message.status_context;
            try {
                const { decryptText, getChatKey } = await import('@/utils/chatCrypto');
                // Status is encrypted with owner's self-key (userId === userId)
                const statusKey = await getChatKey(ctx.user_id, ctx.user_id);

                let content = ctx.content || '';
                let mediaUrl = ctx.media_url || '';

                if (content && content.trim().startsWith('{')) {
                    try { content = await decryptText(content, statusKey); } catch (e) { content = '🔒 Status'; }
                }
                if (mediaUrl && mediaUrl.trim().startsWith('{')) {
                    try { mediaUrl = await decryptText(mediaUrl, statusKey); } catch (e) { mediaUrl = ''; }
                }

                setDecryptedStatusContent(content);
                setDecryptedStatusMedia(mediaUrl);
            } catch (e) {
                // Fallback: show as-is or placeholder
                setDecryptedStatusContent(message.status_context?.content?.startsWith('{') ? '🔒 Status' : message.status_context?.content);
                setDecryptedStatusMedia(message.status_context?.media_url?.startsWith('{') ? '' : message.status_context?.media_url);
            }
        };

        decryptStatusContext();
    }, [message.status_context]);

    const formatTime = (ts: string) => {
        if (!ts) return '';
        const date = new Date(ts);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };



    const handleLongPress = (event: any) => {
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
        const isScreenshot = message.message === 'SYSTEM_MSG: SCREENSHOT_TAKEN';

        return (
            <View style={{
                flexDirection: 'row',
                justifyContent: 'center',
                marginVertical: 12,
                paddingHorizontal: 16,
                width: '100%'
            }}>
                <View style={{
                    backgroundColor: isScreenshot ? '#FEF2F2' : (isCurrentUser ? '#FFF7ED' : '#F9FAFB'),
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isScreenshot ? '#FECACA' : (isCurrentUser ? '#FFEDD5' : '#F3F4F6'),
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
                    <Ionicons
                        name={isScreenshot ? "scan-outline" : "ban-outline"}
                        size={16}
                        color={isScreenshot ? '#EF4444' : (isCurrentUser ? '#F97316' : '#6B7280')}
                    />
                    <Text style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: isScreenshot ? '#DC2626' : (isCurrentUser ? '#C2410C' : '#374151'),
                        fontStyle: 'italic'
                    }}>
                        {isScreenshot
                            ? (isCurrentUser ? 'You took a screenshot' : 'Screenshot taken by friend')
                            : (isCurrentUser ? 'You deleted this message' : 'This message was deleted')}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={{ position: 'relative', width: '100%', overflow: 'visible' }}>
            <Animated.View
                style={[
                    {
                        position: 'absolute',
                        top: '40%',
                        ...(isCurrentUser ? { right: 10 } : { left: 10 })
                    },
                    iconAnimatedStyle
                ]}
            >
                <Ionicons name="arrow-undo-circle" size={28} color="#F68537" />
            </Animated.View>

            <GestureDetector gesture={panGesture}>
                <Animated.View
                    style={[
                        {
                            width: '100%',
                            marginBottom: 12,
                            paddingHorizontal: 16,
                            flexDirection: 'column',
                            alignItems: isCurrentUser ? 'flex-end' : 'flex-start'
                        },
                        animatedStyle
                    ]}
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
                        <TouchableOpacity
                            onPress={(e) => {
                                e.stopPropagation(); // prevent long press or other clicks
                                Haptics.selectionAsync();
                                router.push(`/status/viewer?userId=${message.status_context.user_id}`);
                            }}
                            activeOpacity={0.7}
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
                                    Status Reply
                                </Text>
                                <Text style={{ fontSize: 12, color: isCurrentUser ? 'rgba(255, 255, 255, 0.9)' : '#4B5563' }} numberOfLines={2}>
                                    {message.status_context.media_type === 'text'
                                        ? (decryptedStatusContent || '...')
                                        : (message.status_context.caption || 'Media Status')}
                                </Text>
                            </View>
                            {message.status_context.media_type !== 'text' && (decryptedStatusMedia || message.status_context.media_url) && (
                                <Image
                                    source={{ uri: decryptedStatusMedia || message.status_context.media_url }}
                                    style={{ width: 44, height: 44, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.1)' }}
                                    contentFit="cover"
                                />
                            )}
                        </TouchableOpacity>
                    )}

                    {/* Reply Context */}
                    {message.reply && message.reply.id && !message.status_context && (
                        <TouchableOpacity
                            onPress={(e) => {
                                e.stopPropagation();
                                Haptics.selectionAsync();
                                onReplyClick?.(message.reply);
                            }}
                            activeOpacity={0.7}
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

                    {/* Ledger Entry UI */}
                    {message.message_type === 'ledger' && message.message?.startsWith('SYSTEM_LEDGER:') && (
                        <View style={{ padding: 12, width: 220 }}>
                            {(() => {
                                try {
                                    const data = JSON.parse(message.message.replace('SYSTEM_LEDGER:', ''));
                                    const isDeneHain = data.type === 'gave' ? !isCurrentUser : isCurrentUser;
                                    const themeColor = isDeneHain ? '#EF4444' : '#F68537';
                                    const label = isDeneHain ? 'Dene Hain' : 'Lene Hain';

                                    return (
                                        <>
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
                                                    backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : `${themeColor}10`,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    marginRight: 12
                                                }}>
                                                    <Ionicons name="receipt" size={20} color={isCurrentUser ? 'white' : themeColor} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: isCurrentUser ? 'white' : '#1F2937' }}>Hisab-Kitab</Text>
                                                </View>
                                            </View>
                                            <View>
                                                <Text style={{ fontSize: 24, fontWeight: '900', color: isCurrentUser ? 'white' : themeColor }}>
                                                    ₹{data.amount}
                                                </Text>
                                                <Text style={{ fontSize: 14, color: isCurrentUser ? 'rgba(255,255,255,0.8)' : '#64748B', marginTop: 4 }}>
                                                    {data.description}
                                                </Text>
                                                <View style={{
                                                    marginTop: 10,
                                                    paddingHorizontal: 10,
                                                    paddingVertical: 5,
                                                    borderRadius: 10,
                                                    backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : `${themeColor}20`,
                                                    alignSelf: 'flex-start',
                                                    borderWidth: isCurrentUser ? 0 : 1,
                                                    borderColor: `${themeColor}40`
                                                }}>
                                                    <Text style={{ fontSize: 11, fontWeight: '900', color: isCurrentUser ? 'white' : themeColor, textTransform: 'uppercase' }}>
                                                        {label}
                                                    </Text>
                                                </View>
                                            </View>
                                        </>
                                    );
                                } catch (e) {
                                    return <Text style={{ color: 'red' }}>Error parsing ledger entry</Text>;
                                }
                            })()}
                        </View>
                    )}

                    {/* Image Content */}
                    {imageUrl && (
                        <TouchableOpacity
                            onPress={() => {
                                onImagePress?.(localImageUrl || imageUrl);
                            }}
                            onLongPress={handleLongPress}
                            delayLongPress={200}
                        >
                            <Image
                                source={{ uri: (localImageUrl || imageUrl)?.trim() }}
                                style={{ width: 256, height: 256, backgroundColor: '#F3F4F6', borderRadius: 12 }}
                                contentFit="cover"
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
                        {textContent && textContent.trim() !== '' &&
                            !(hasImage && textContent.startsWith('Sent ')) &&
                            !(isVoiceMessage && textContent.startsWith('Sent ')) &&
                            message.message_type !== 'ledger' && (
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
            </GestureDetector>
        </View>
    );
}, areEqual);

export default MessageItem;
