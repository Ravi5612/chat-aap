import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import MessageStatus from './MessageStatus';
import VoiceMessagePlayer from './VoiceMessagePlayer';

interface MessageContentProps {
    message: any;
    isCurrentUser: boolean;
    formatTime: (ts: string) => string;
    handleLongPress: (e: any) => void;
    onImagePress?: (uri: string) => void;
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
}

export default function MessageContent({
    message, isCurrentUser, formatTime, handleLongPress, onImagePress,
    imageUrl, localImageUrl, imageLoading, uploadProgress,
    isVoiceMessage, voiceUri, localVoiceUrl, textContent,
    isContactMessage, contactName, contactPhone,
    isLocationMessage, locationCoords, locationAddress,
    isDocumentMessage, documentName, documentSize, documentUrl,
    hasImage
}: MessageContentProps) {
    const isCallLog = message.message_type === 'call' || !!message.call_details;
    const callDetails = message.call_details || {};

    const ledgerData = useMemo(() => {
        if (message.message_type === 'ledger' && message.message?.startsWith('SYSTEM_LEDGER:')) {
            try { return JSON.parse(message.message.replace('SYSTEM_LEDGER:', '')); } catch (e) { return null; }
        }
        return null;
    }, [message.message, message.message_type]);

    return (
        <>
            {/* Ledger Entry UI */}
            {message.message_type === 'ledger' && message.message?.startsWith('SYSTEM_LEDGER:') && (
                <View style={{ padding: 12, width: 220 }}>
                    {(() => {
                        try {
                            const data = ledgerData;
                            if (!data) return <Text style={{ color: 'red' }}>Error parsing ledger</Text>;
                            const isDeneHain = data.type === 'gave' ? !isCurrentUser : isCurrentUser;
                            const themeColor = isDeneHain ? '#EF4444' : '#F68537';
                            const label = isDeneHain ? 'Dene Hain' : 'Lene Hain';
                            return (
                                <>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : '#E5E7EB' }}>
                                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : `${themeColor}10`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                            <Ionicons name="receipt" size={20} color={isCurrentUser ? 'white' : themeColor} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: isCurrentUser ? 'white' : '#1F2937' }}>Hisab-Kitab</Text>
                                        </View>
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 24, fontWeight: '900', color: isCurrentUser ? 'white' : themeColor }}>₹{data.amount}</Text>
                                        <Text style={{ fontSize: 14, color: isCurrentUser ? 'rgba(255,255,255,0.8)' : '#64748B', marginTop: 4 }}>{data.description}</Text>
                                        <View style={{ marginTop: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : `${themeColor}20`, alignSelf: 'flex-start', borderWidth: isCurrentUser ? 0 : 1, borderColor: `${themeColor}40` }}>
                                            <Text style={{ fontSize: 11, fontWeight: '900', color: isCurrentUser ? 'white' : themeColor, textTransform: 'uppercase' }}>{label}</Text>
                                        </View>
                                    </View>
                                </>
                            );
                        } catch (e) { return <Text style={{ color: 'red' }}>Error</Text>; }
                    })()}
                </View>
            )}

            {/* Image Content */}
            {imageUrl && (
                <TouchableOpacity onPress={() => onImagePress?.((localImageUrl || imageUrl) as string)} onLongPress={handleLongPress} delayLongPress={200}>
                    <View style={{ width: 256, height: 256, borderRadius: 12, overflow: 'hidden', backgroundColor: '#374151' }}>
                        <Image 
                            source={{ uri: (localImageUrl || imageUrl)?.trim() || '' }} 
                            placeholder={localImageUrl ? { uri: localImageUrl.trim() } : null}
                            style={{ width: 256, height: 256 }} 
                            contentFit="cover" 
                            transition={300}
                        />
                        {imageLoading && uploadProgress === undefined && (
                            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' }}>
                                <ActivityIndicator size="small" color="#F68537" />
                            </View>
                        )}
                        {uploadProgress !== undefined && uploadProgress <= 100 && (
                            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
                                <View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 5, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                                    <View style={{ position: 'absolute', width: 72, height: 72, borderRadius: 36, borderWidth: 5, borderColor: 'transparent', borderTopColor: '#F68537', borderRightColor: uploadProgress > 25 ? '#F68537' : 'transparent', borderBottomColor: uploadProgress > 50 ? '#F68537' : 'transparent', borderLeftColor: uploadProgress > 75 ? '#F68537' : 'transparent', transform: [{ rotate: `${(uploadProgress / 100) * 360}deg` }] }} />
                                    <Text style={{ color: 'white', fontSize: 14, fontWeight: '900', letterSpacing: -0.5 }}>{uploadProgress}%</Text>
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

            {/* Call Log Content */}
            {isCallLog && (
                <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 180 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : 'rgba(246, 133, 55, 0.1)', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name={callDetails.type === 'video' ? "videocam" : "call"} size={20} color={isCurrentUser ? 'white' : '#F68537'} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: isCurrentUser ? 'white' : '#1F2937' }}>
                            {callDetails.status === 'missed' ? 'Missed Call' : callDetails.type === 'video' ? 'Video Call' : 'Audio Call'}
                        </Text>
                        <Text style={{ fontSize: 12, color: isCurrentUser ? 'rgba(255,255,255,0.8)' : '#6B7280', marginTop: 2 }}>
                            {callDetails.status === 'completed' ? (callDetails.duration > 0 ? `Duration: ${Math.floor(callDetails.duration / 60)}m ${callDetails.duration % 60}s` : 'Call Ended') : 'No answer'}
                        </Text>
                    </View>
                </View>
            )}

            {/* Contact Card */}
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
                    <TouchableOpacity onPress={() => Linking.openURL(`tel:${contactPhone}`)} style={{ alignItems: 'center', paddingVertical: 4 }}>
                        <Text style={{ color: isCurrentUser ? 'white' : '#F68537', fontWeight: 'bold', fontSize: 14 }}>Call {contactPhone}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Location Card */}
            {isLocationMessage && (
                <View style={{ padding: 12, width: 220 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : '#E5E7EB' }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : 'rgba(16, 185, 129, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                            <Ionicons name="location" size={20} color={isCurrentUser ? 'white' : '#10B981'} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: isCurrentUser ? 'white' : '#1F2937' }} numberOfLines={1}>Location</Text>
                            <Text style={{ fontSize: 12, color: isCurrentUser ? 'rgba(255,255,255,0.8)' : '#6B7280' }} numberOfLines={2}>{locationAddress}</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => Linking.openURL(`https://maps.google.com/?q=${locationCoords}`)} style={{ alignItems: 'center', paddingVertical: 4 }}>
                        <Text style={{ color: isCurrentUser ? 'white' : '#10B981', fontWeight: 'bold', fontSize: 14 }}>View on Map</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Document Card */}
            {isDocumentMessage && (
                <View style={{ padding: 12, width: 240 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : '#E5E7EB' }}>
                        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : 'rgba(124, 58, 237, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                            <Ionicons name="document-text" size={24} color={isCurrentUser ? 'white' : '#7C3AED'} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: 'bold', color: isCurrentUser ? 'white' : '#1F2937' }} numberOfLines={2}>{documentName}</Text>
                            {documentSize ? <Text style={{ fontSize: 12, color: isCurrentUser ? 'rgba(255,255,255,0.8)' : '#6B7280', marginTop: 2 }}>{documentSize}</Text> : null}
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => { if (documentUrl) Linking.openURL(documentUrl); }} disabled={!documentUrl || message.status === 'sending'} style={{ alignItems: 'center', paddingVertical: 4 }}>
                        <Text style={{ color: isCurrentUser ? 'white' : '#7C3AED', fontWeight: 'bold', fontSize: 14 }}>{message.status === 'sending' ? 'Uploading...' : 'Open Document'}</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                {textContent && textContent.trim() !== '' && !(hasImage && textContent.startsWith('Sent ')) && !(isVoiceMessage && textContent.startsWith('Sent ')) && message.message_type !== 'ledger' && (
                    <Text style={{ fontSize: 15, lineHeight: 22, color: isCurrentUser ? 'white' : '#1F2937', fontStyle: textContent.trim().startsWith('{"iv":') || textContent === 'SYSTEM_MSG: DELETED' ? 'italic' : 'normal', opacity: textContent.trim().startsWith('{"iv":') || textContent === 'SYSTEM_MSG: DELETED' ? 0.7 : 1 }}>
                        {textContent.trim().startsWith('{"iv":') ? 'Decrypting...' : (textContent === 'SYSTEM_MSG: DELETED' ? '🚫 This message was deleted' : textContent)}
                    </Text>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 }}>
                    <Text style={{ fontSize: 10, color: isCurrentUser ? 'rgba(255, 255, 255, 0.7)' : '#9CA3AF' }}>{formatTime(message.created_at)}</Text>
                    {isCurrentUser && <MessageStatus status={message.status || 'sent'} />}
                </View>
            </View>
        </>
    );
}
