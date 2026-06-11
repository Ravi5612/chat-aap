
import React, { useMemo, useState, useRef, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { useRouter } from 'expo-router';
import MessageStatus from './MessageStatus';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import StatusMentionCard from './StatusMentionCard';

interface MessageContentProps {
    message: any;
    isCurrentUser: boolean;
    formatTime: (ts: string) => string;
    handleLongPress: (e: any) => void;
    onImagePress?: (uri: string, isVideo?: boolean) => void;
    imageUrl: string | null;
    localImageUrl: string | null;
    imageLoading: boolean;
    uploadProgress?: number;
    isVoiceMessage: boolean;
    voiceUri: string | null;
    localVoiceUrl: string | null;
    textContent: string;
    isContactMessage: boolean;
    contactName: string;
    contactPhone: string;
    isLocationMessage: boolean;
    locationCoords: string;
    locationAddress: string;
    isDocumentMessage: boolean;
    documentName: string;
    documentSize: string;
    documentUrl: string | null;
    hasImage: boolean;
    isVideoMessage?: boolean;
    videoUrl?: string | null;
}

const MessageContent = memo(({
    message, isCurrentUser, formatTime, handleLongPress, onImagePress,
    imageUrl, localImageUrl, imageLoading, uploadProgress,
    isVoiceMessage, voiceUri, localVoiceUrl, textContent,
    isContactMessage, contactName, contactPhone,
    isLocationMessage, locationCoords, locationAddress,
    isDocumentMessage, documentName, documentSize, documentUrl,
    hasImage, isVideoMessage, videoUrl
}: MessageContentProps) => {
    const router = useRouter();
    const [videoPlaying, setVideoPlaying] = useState(false);
    const videoRef = useRef<Video>(null);
    const isCallLog = message.message_type === 'call' || !!message.call_details;
    const callDetails = message.call_details || {};
    
    const ledgerData = useMemo(() => {
        if (message.message_type === 'ledger' && message?.message?.startsWith('SYSTEM_LEDGER:')) {
            try { return JSON.parse(message.message.replace('SYSTEM_LEDGER:', '')); } catch (e) { return null; }
        }
        return null;
    }, [message.message, message.message_type]);

    const textMetrics = useMemo(() => {
        const text = textContent || '';
        const trimmedText = text.trim();
        const isStatusMention = text.startsWith('[StatusMention] ');
        const statusMentionId = isStatusMention ? text.replace('[StatusMention] ', '').trim() : null;
        
        const isSentPrefix = text.startsWith('Sent ');
        const showText = trimmedText !== '' 
            && !isStatusMention 
            && !(hasImage && isSentPrefix) 
            && !(isVoiceMessage && isSentPrefix) 
            && !(isDocumentMessage && isSentPrefix)
            && !(isVideoMessage && isSentPrefix)
            && message.message_type !== 'ledger';
            
        const isDecrypting = trimmedText.startsWith('{"iv":');
        const isDeleted = text === 'SYSTEM_MSG: DELETED';
        
        let finalDisplay = text;
        if (isDecrypting) finalDisplay = 'Decrypting...';
        else if (isDeleted) finalDisplay = '🚫 This message was deleted';
        
        return { isStatusMention, statusMentionId, showText, finalDisplay, isDecrypting, isDeleted };
    }, [textContent, hasImage, isVoiceMessage, message.message_type]);

    const handleImageContentPress = useCallback(() => {
        onImagePress?.((localImageUrl || imageUrl) as string);
    }, [onImagePress, localImageUrl, imageUrl]);

    const handleVideoContentPress = useCallback(() => {
        onImagePress?.(videoUrl as string, true);
    }, [onImagePress, videoUrl]);

    const handleContactPress = useCallback(() => {
        Linking.openURL(`tel:${contactPhone}`);
    }, [contactPhone]);

    const handleLocationPress = useCallback(() => {
        Linking.openURL(`https://maps.google.com/?q=${locationCoords}`);
    }, [locationCoords]);

    const handleDocumentPress = useCallback(() => {
        if (documentUrl) Linking.openURL(documentUrl);
    }, [documentUrl]);

    return (
        <>
            {/* Ledger Entry UI */}
            {message.message_type === 'ledger' && ledgerData && (
                <View style={styles.ledgerContainer}>
                    <View style={[styles.ledgerHeader, { borderBottomColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : '#E5E7EB' }]}>
                        <View style={[styles.ledgerIconContainer, { backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : `${ledgerData.type === 'gave' ? (isCurrentUser ? '#F68537' : '#EF4444') : (isCurrentUser ? '#EF4444' : '#F68537')}10` }]}>
                            <Ionicons name="receipt" size={20} color={isCurrentUser ? 'white' : (ledgerData.type === 'gave' ? (isCurrentUser ? '#F68537' : '#EF4444') : (isCurrentUser ? '#EF4444' : '#F68537'))} />
                        </View>
                        <View style={styles.flex1}>
                            <Text style={[styles.ledgerTitle, { color: isCurrentUser ? 'white' : '#1F2937' }]}>Hisab-Kitab</Text>
                        </View>
                    </View>
                    <View>
                        <Text style={[styles.ledgerAmount, { color: isCurrentUser ? 'white' : (ledgerData.type === 'gave' ? (isCurrentUser ? '#F68537' : '#EF4444') : (isCurrentUser ? '#EF4444' : '#F68537')) }]}>₹{ledgerData.amount}</Text>
                        <Text style={[styles.ledgerDesc, { color: isCurrentUser ? 'rgba(255,255,255,0.8)' : '#64748B' }]}>{ledgerData.description}</Text>
                        <View style={[
                            styles.ledgerBadge,
                            { 
                                backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : `${ledgerData.type === 'gave' ? (isCurrentUser ? '#F68537' : '#EF4444') : (isCurrentUser ? '#EF4444' : '#F68537')}20`,
                                borderWidth: isCurrentUser ? 0 : 1, 
                                borderColor: `${ledgerData.type === 'gave' ? (isCurrentUser ? '#F68537' : '#EF4444') : (isCurrentUser ? '#EF4444' : '#F68537')}40` 
                            }
                        ]}>
                            <Text style={[styles.ledgerBadgeText, { color: isCurrentUser ? 'white' : (ledgerData.type === 'gave' ? (isCurrentUser ? '#F68537' : '#EF4444') : (isCurrentUser ? '#EF4444' : '#F68537')) }]}>
                                {ledgerData.type === 'gave' ? (!isCurrentUser ? 'Dene Hain' : 'Lene Hain') : (!isCurrentUser ? 'Lene Hain' : 'Dene Hain')}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Image Content */}
            {imageUrl && (
                <TouchableOpacity onPress={handleImageContentPress} onLongPress={handleLongPress} delayLongPress={200}>
                    <View style={styles.mediaContainer}>
                        <Image 
                            source={{ uri: (localImageUrl || imageUrl)?.trim() || '' }} 
                            style={styles.mediaImage} 
                            contentFit="cover" 
                            transition={300}
                            cachePolicy="memory"
                        />
                        {imageLoading && uploadProgress === undefined && (
                            <View style={styles.mediaLoadingOverlay}>
                                <ActivityIndicator size="small" color="#F68537" />
                            </View>
                        )}
                        {uploadProgress !== undefined && uploadProgress < 100 && (
                            <View style={styles.uploadOverlay}>
                                <View style={styles.uploadCircle}>
                                    <View style={[styles.uploadProgressFill, { height: `${uploadProgress}%` }]} />
                                    <Text style={styles.uploadProgressText}>{uploadProgress}%</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            )}

            {/* Voice Message Content */}
            {isVoiceMessage && (localVoiceUrl || voiceUri) && (
                <VoiceMessagePlayer uri={(localVoiceUrl || voiceUri) as string} isCurrentUser={isCurrentUser} />
            )}

            {/* Video Message Content */}
            {isVideoMessage && videoUrl && (
                <TouchableOpacity onPress={handleVideoContentPress} onLongPress={handleLongPress} delayLongPress={200}>
                    <View style={styles.videoContainer}>
                        <Video
                            ref={videoRef}
                            source={{ uri: videoUrl }}
                            style={styles.videoPlayer}
                            useNativeControls={false}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={false}
                        />
                        {/* Play Icon Overlay */}
                        {uploadProgress === undefined && (
                            <View style={styles.playIconOverlay}>
                                <View style={styles.playIconCircle}>
                                    <Ionicons name="play" size={28} color="white" style={styles.playIcon} />
                                </View>
                            </View>
                        )}
                        {uploadProgress !== undefined && uploadProgress < 100 && (
                            <View style={styles.uploadOverlayHeavy}>
                                <View style={styles.uploadCircle}>
                                    <View style={[styles.uploadProgressFill, { height: `${uploadProgress}%` }]} />
                                    <Text style={styles.uploadProgressTextHeavy}>{uploadProgress}%</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            )}

            {/* Call Log Content */}
            {isCallLog && (
                <View style={styles.callLogContainer}>
                    <View style={[styles.callLogIcon, { backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : 'rgba(246, 133, 55, 0.1)' }]}>
                        <Ionicons name={callDetails.type === 'video' ? "videocam" : "call"} size={20} color={isCurrentUser ? 'white' : '#F68537'} />
                    </View>
                    <View style={styles.flex1}>
                        <Text style={[styles.callLogTitle, { color: isCurrentUser ? 'white' : '#1F2937' }]}>
                            {callDetails.status === 'missed' ? 'Missed Call' : callDetails.type === 'video' ? 'Video Call' : 'Audio Call'}
                        </Text>
                        <Text style={[styles.callLogSub, { color: isCurrentUser ? 'rgba(255,255,255,0.8)' : '#6B7280' }]}>
                            {callDetails.status === 'completed' ? (callDetails.duration > 0 ? `Duration: ${Math.floor(callDetails.duration / 60)}m ${callDetails.duration % 60}s` : 'Call Ended') : 'No answer'}
                        </Text>
                    </View>
                </View>
            )}

            {/* Contact Card */}
            {isContactMessage && (
                <View style={styles.contactContainer}>
                    <View style={[styles.cardHeader, { borderBottomColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : '#E5E7EB' }]}>
                        <View style={[styles.cardIcon, { backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : '#F3F4F6' }]}>
                            <Ionicons name="person" size={20} color={isCurrentUser ? 'white' : '#9CA3AF'} />
                        </View>
                        <View style={styles.flex1}>
                            <Text style={[styles.cardTitle, { color: isCurrentUser ? 'white' : '#1F2937' }]} numberOfLines={1}>{contactName}</Text>
                            <Text style={[styles.cardSub, { color: isCurrentUser ? 'rgba(255,255,255,0.8)' : '#6B7280' }]}>Contact</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={handleContactPress} style={styles.cardActionBtn}>
                        <Text style={[styles.cardActionText, { color: isCurrentUser ? 'white' : '#F68537' }]}>Call {contactPhone}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Location Card */}
            {isLocationMessage && (
                <View style={styles.contactContainer}>
                    <View style={[styles.cardHeader, { borderBottomColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : '#E5E7EB' }]}>
                        <View style={[styles.cardIcon, { backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : 'rgba(16, 185, 129, 0.1)' }]}>
                            <Ionicons name="location" size={20} color={isCurrentUser ? 'white' : '#10B981'} />
                        </View>
                        <View style={styles.flex1}>
                            <Text style={[styles.cardTitle, { color: isCurrentUser ? 'white' : '#1F2937' }]} numberOfLines={1}>Location</Text>
                            <Text style={[styles.cardSub, { color: isCurrentUser ? 'rgba(255,255,255,0.8)' : '#6B7280' }]} numberOfLines={2}>{locationAddress}</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={handleLocationPress} style={styles.cardActionBtn}>
                        <Text style={[styles.cardActionText, { color: isCurrentUser ? 'white' : '#10B981' }]}>View on Map</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Document Card */}
            {isDocumentMessage && (
                <View style={styles.docContainer}>
                    <View style={[styles.cardHeader, { borderBottomColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : '#E5E7EB' }]}>
                        <View style={[styles.docIcon, { backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : 'rgba(124, 58, 237, 0.1)' }]}>
                            <Ionicons name="document-text" size={24} color={isCurrentUser ? 'white' : '#7C3AED'} />
                        </View>
                        <View style={styles.flex1}>
                            <Text style={[styles.docTitle, { color: isCurrentUser ? 'white' : '#1F2937' }]} numberOfLines={2}>{documentName}</Text>
                            {documentSize ? <Text style={[styles.docSub, { color: isCurrentUser ? 'rgba(255,255,255,0.8)' : '#6B7280' }]}>{documentSize}</Text> : null}
                        </View>
                    </View>
                    <TouchableOpacity onPress={handleDocumentPress} disabled={!documentUrl || message.status === 'sending'} style={styles.cardActionBtn}>
                        <Text style={[styles.cardActionText, { color: isCurrentUser ? 'white' : '#7C3AED' }]}>{message.status === 'sending' ? 'Uploading...' : 'Open Document'}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Status Mention Card - Premium Design */}
            {textMetrics.isStatusMention && textMetrics.statusMentionId && (
                <StatusMentionCard
                    statusId={textMetrics.statusMentionId}
                    isCurrentUser={isCurrentUser}
                    targetUserId={message.sender_id}
                    router={router}
                />
            )}

            <View style={styles.footerContainer}>
                {textMetrics.showText && (
                    <Text style={[
                        styles.msgText,
                        { color: isCurrentUser ? 'white' : '#1F2937' },
                        (textMetrics.isDecrypting || textMetrics.isDeleted) && styles.msgTextItalic
                    ]}>
                        {textMetrics.finalDisplay}
                    </Text>
                )}

                <View style={styles.timeContainer}>
                    <Text style={[styles.timeText, { color: isCurrentUser ? 'rgba(255, 255, 255, 0.7)' : '#9CA3AF' }]}>{formatTime(message.created_at)}</Text>
                    {isCurrentUser && <MessageStatus status={message.status || 'sent'} />}
                </View>
            </View>
        </>
    );
});

const styles = StyleSheet.create({
    errorText: {
        color: 'red'
    },
    ledgerContainer: {
        padding: 12,
        width: 220
    },
    ledgerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1
    },
    ledgerIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    flex1: {
        flex: 1
    },
    ledgerTitle: {
        fontSize: 16,
        fontWeight: 'bold'
    },
    ledgerAmount: {
        fontSize: 24,
        fontWeight: '900'
    },
    ledgerDesc: {
        fontSize: 14,
        marginTop: 4
    },
    ledgerBadge: {
        marginTop: 10,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        alignSelf: 'flex-start'
    },
    ledgerBadgeText: {
        fontSize: 11,
        fontWeight: '900',
        textTransform: 'uppercase'
    },
    mediaContainer: {
        width: 256,
        height: 256,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#374151'
    },
    mediaImage: {
        width: 256,
        height: 256
    },
    mediaLoadingOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#374151',
        alignItems: 'center',
        justifyContent: 'center'
    },
    uploadOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12
    },
    uploadOverlayHeavy: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12
    },
    uploadCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
    },
    uploadProgressFill: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        backgroundColor: '#F68537'
    },
    uploadProgressText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: -0.5
    },
    uploadProgressTextHeavy: {
        color: 'white',
        fontSize: 14,
        fontWeight: '900'
    },
    videoContainer: {
        width: 256,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#000',
        position: 'relative'
    },
    videoPlayer: {
        width: 256,
        height: 200
    },
    playIconOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)'
    },
    playIconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    playIcon: {
        marginLeft: 4
    },
    callLogContainer: {
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minWidth: 180
    },
    callLogIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center'
    },
    callLogTitle: {
        fontSize: 14,
        fontWeight: 'bold'
    },
    callLogSub: {
        fontSize: 12,
        marginTop: 2
    },
    contactContainer: {
        padding: 12,
        width: 220
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1
    },
    cardIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold'
    },
    cardSub: {
        fontSize: 12
    },
    cardActionBtn: {
        alignItems: 'center',
        paddingVertical: 4
    },
    cardActionText: {
        fontWeight: 'bold',
        fontSize: 14
    },
    docContainer: {
        padding: 12,
        width: 240
    },
    docIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    docTitle: {
        fontSize: 15,
        fontWeight: 'bold'
    },
    docSub: {
        fontSize: 12,
        marginTop: 2
    },
    footerContainer: {
        paddingHorizontal: 12,
        paddingVertical: 8
    },
    msgText: {
        fontSize: 15,
        lineHeight: 22
    },
    msgTextItalic: {
        fontStyle: 'italic',
        opacity: 0.7
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4
    },
    timeText: {
        fontSize: 10
    }
});

export default MessageContent;
