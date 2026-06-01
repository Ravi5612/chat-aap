import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';

import ReplyPreview from './ReplyPreview';
import AttachmentMenu from './AttachmentMenu';
import AudioRecorder from './AudioRecorder';
import ContactPickerModal from './ContactPickerModal';
import EmojiPickerModal from './EmojiPickerModal';
import { EditingBanner, SelectedImagePreview, NonMemberOverlay } from './ChatInputOverlays';

import { useMediaPicker } from '@/hooks/chatInput/useMediaPicker';
import { useLocationPicker } from '@/hooks/chatInput/useLocationPicker';
import { useDocumentPicker } from '@/hooks/chatInput/useDocumentPicker';
import CustomCameraModal from './CustomCameraModal';
import ScheduleMessageModal from './ScheduleMessageModal';
import {
    ExpoSpeechRecognitionModule,
    useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { Text } from 'react-native';

interface ChatInputProps {
    onSendMessage: (text: string, scheduledAt?: Date) => void;
    onTyping?: (isTyping: boolean) => void;
    disabled?: boolean;
    replyingTo?: any;
    onCancelReply?: () => void;
    editingMessage?: any;
    onCancelEdit?: () => void;
    onSaveEdit?: (text: string) => void;
    isMember?: boolean;
    isKeyboardOpen?: boolean;
    initialMessage?: string;
    onDraftChange?: (text: string) => void;
}

export default function ChatInput({
    onSendMessage, onTyping, disabled = false,
    replyingTo, onCancelReply, editingMessage, onCancelEdit, onSaveEdit,
    isMember = true, isKeyboardOpen = false, initialMessage = '', onDraftChange
}: ChatInputProps) {
    const [message, setMessage] = useState(initialMessage);
    const [selectedMedia, setSelectedMedia] = useState<{ uri: string, type: 'image' | 'video' } | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [emojiModalVisible, setEmojiModalVisible] = useState(false);
    const [contactModalVisible, setContactModalVisible] = useState(false);
    const [cameraModalVisible, setCameraModalVisible] = useState(false);
    const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
    const [isVoiceTyping, setIsVoiceTyping] = useState(false);
    const [voiceLang, setVoiceLang] = useState('hi-IN'); // Default to Hindi

    const insets = useSafeAreaInsets();
    const hasMeasured = insets.top > 0 || insets.bottom > 0;
    const safeBottom = hasMeasured ? insets.bottom : (initialWindowMetrics?.insets?.bottom || 0);

    const inputRef = useRef<TextInput>(null);
    const typingTimeoutRef = useRef<any>(null);
    const draftTimeoutRef = useRef<any>(null);
    const lastSentTimeRef = useRef(0);
    const lastTypingSentRef = useRef(0);

    const { handlePickImage, handleLaunchCamera: originalHandleLaunchCamera } = useMediaPicker((uri) => uri ? setSelectedMedia({ uri, type: 'image' }) : setSelectedMedia(null));
    const handleLaunchCamera = () => setCameraModalVisible(true);
    const { handleLocation } = useLocationPicker(onSendMessage);
    const { handleDocument } = useDocumentPicker(onSendMessage);

    React.useEffect(() => {
        if (editingMessage) {
            setMessage(editingMessage.message);
            inputRef.current?.focus();
        } else if (replyingTo) {
            inputRef.current?.focus();
        }
    }, [editingMessage, replyingTo]);

    React.useEffect(() => {
        if (initialMessage) setMessage(initialMessage);
    }, [initialMessage]);

    useSpeechRecognitionEvent('start', () => setIsVoiceTyping(true));
    useSpeechRecognitionEvent('end', () => setIsVoiceTyping(false));
    useSpeechRecognitionEvent('error', (event) => {
        console.log('Voice Error:', event.error, event.message);
        setIsVoiceTyping(false);
    });
    useSpeechRecognitionEvent('result', (event) => {
        if (event.results && event.results.length > 0) {
            const transcript = event.results[0]?.transcript;
            if (transcript) {
                setMessage(prev => prev + (prev.length > 0 ? " " : "") + transcript);
            }
        }
    });

    const startVoiceTyping = async () => {
        try {
            const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            if (!result.granted) {
                console.warn('Voice permission not granted');
                return;
            }
            ExpoSpeechRecognitionModule.start({
                lang: voiceLang,
                interimResults: true,
                continuous: false,
            });
        } catch (e) {
            console.error(e);
        }
    };

    const stopVoiceTyping = () => {
        try {
            ExpoSpeechRecognitionModule.stop();
        } catch (e) {
            console.error(e);
        }
    };

    const handleSubmit = (scheduledDate?: Date) => {
        if (!message.trim() && !selectedMedia) {
            if (Date.now() - lastSentTimeRef.current < 500) return;
            setIsRecording(true);
            return;
        }
        if (editingMessage && onSaveEdit) {
            onSaveEdit(message.trim());
        } else {
            let finalMessage = message.trim();
            if (selectedMedia) {
                const prefix = selectedMedia.type === 'video' ? '[Video]' : '[Image]';
                finalMessage = `${prefix} ${selectedMedia.uri} ${message.trim()}`;
            }
            onSendMessage(finalMessage, scheduledDate);
        }
        lastSentTimeRef.current = Date.now();
        setMessage('');
        setSelectedMedia(null);
        if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
        if (onDraftChange) onDraftChange('');
        if (onTyping) {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            onTyping(false);
        }
    };

    const handleChangeText = (text: string) => {
        setMessage(text);
        if (onDraftChange) {
            if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
            draftTimeoutRef.current = setTimeout(() => { onDraftChange(text); }, 500);
        }
        if (onTyping) {
            const now = Date.now();
            if (now - lastTypingSentRef.current > 3000) {
                onTyping(true);
                lastTypingSentRef.current = now;
            }
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                onTyping(false);
                lastTypingSentRef.current = 0;
            }, 2000);
        }
    };

    const bottomPadding = isKeyboardOpen ? 5 : (safeBottom > 0 ? safeBottom : 12);

    return (
        <View style={{ backgroundColor: 'transparent', borderTopWidth: 0, paddingBottom: bottomPadding, position: 'relative' }}>
            {!isMember && <NonMemberOverlay />}

            <View style={{ opacity: isMember ? 1 : 0.5, pointerEvents: isMember ? 'auto' : 'none' }}>
                {isRecording && (
                    <AudioRecorder
                        onRecordingComplete={(uri) => { onSendMessage(`[Voice Message] ${uri}`); setIsRecording(false); }}
                        onCancel={() => setIsRecording(false)}
                    />
                )}

                <ReplyPreview replyingTo={replyingTo} onCancel={onCancelReply || (() => {})} />

                {editingMessage && (
                    <EditingBanner editingMessage={editingMessage} onCancelEdit={onCancelEdit} />
                )}

                {selectedMedia && !isRecording && (
                    <SelectedImagePreview imageUri={selectedMedia.uri} onRemove={() => setSelectedMedia(null)} isVideo={selectedMedia.type === 'video'} />
                )}

                <View style={[styles.inputRow, { opacity: isRecording ? 0 : 1 }]}>
                    <View style={styles.inputBubble}>
                        <TouchableOpacity 
                            onPress={() => setVoiceLang(prev => prev === 'hi-IN' ? 'en-US' : 'hi-IN')}
                            style={{ padding: 8, paddingRight: 4 }}
                        >
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#F68537' }}>
                                {voiceLang === 'hi-IN' ? 'HI' : 'EN'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                if (emojiModalVisible) { setEmojiModalVisible(false); inputRef.current?.focus(); }
                                else { inputRef.current?.blur(); setEmojiModalVisible(true); }
                            }}
                            style={{ padding: 8 }}
                        >
                            <Ionicons name="happy-outline" size={26} color={emojiModalVisible ? "#F68537" : "#6B7280"} />
                        </TouchableOpacity>

                        <TextInput
                            ref={inputRef}
                            style={styles.textInput}
                            placeholder={isVoiceTyping ? "Listening..." : (editingMessage ? "Edit message..." : "Message")}
                            placeholderTextColor={isVoiceTyping ? "#F68537" : "#94A3B8"}
                            value={message}
                            onChangeText={handleChangeText}
                            multiline
                            maxLength={1000}
                            editable={!disabled && !isVoiceTyping}
                        />

                        <AttachmentMenu
                            onImage={handlePickImage}
                            onCamera={handleLaunchCamera}
                            onLocation={handleLocation}
                            onContact={() => setContactModalVisible(true)}
                            onDocument={handleDocument}
                            onSchedule={() => setScheduleModalVisible(true)}
                        />

                        {!message.trim() && !selectedMedia && (
                            <TouchableOpacity onPress={handleLaunchCamera} style={{ padding: 8 }}>
                                <Ionicons name="camera" size={26} color="#6B7280" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity 
                        onPress={() => handleSubmit()} 
                        onLongPress={() => {
                            if (!message.trim() && !selectedMedia) {
                                startVoiceTyping();
                            }
                        }}
                        onPressOut={() => {
                            if (isVoiceTyping) {
                                stopVoiceTyping();
                            }
                        }}
                        disabled={disabled} 
                        style={[styles.sendBtn, isVoiceTyping && { backgroundColor: '#EF4444' }]}
                    >
                        <Ionicons
                            name={editingMessage ? "checkmark" : (message.trim() || selectedMedia ? "send" : "mic")}
                            size={24}
                            color="white"
                            style={{ marginLeft: (message.trim() || selectedMedia) ? 3 : 0 }}
                        />
                    </TouchableOpacity>
                </View>

                {emojiModalVisible && (
                    <EmojiPickerModal
                        visible={emojiModalVisible}
                        onClose={() => { setEmojiModalVisible(false); inputRef.current?.focus(); }}
                        onSelect={(emoji) => setMessage(prev => prev + emoji)}
                        isInline={true}
                    />
                )}

                <ContactPickerModal
                    visible={contactModalVisible}
                    onClose={() => setContactModalVisible(false)}
                    onSelectContact={(name, phone) => onSendMessage(`[Contact] ${name} | ${phone}`)}
                />

                <CustomCameraModal
                    visible={cameraModalVisible}
                    onClose={() => setCameraModalVisible(false)}
                    onCapture={(media) => setSelectedMedia(media)}
                />

                <ScheduleMessageModal
                    visible={scheduleModalVisible}
                    onClose={() => setScheduleModalVisible(false)}
                    onSchedule={(date) => handleSubmit(date)}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    inputRow: {
        flexDirection: 'row', alignItems: 'flex-end',
        gap: 6, paddingHorizontal: 8, paddingVertical: 10,
    },
    inputBubble: {
        flex: 1, backgroundColor: 'white', borderRadius: 25,
        minHeight: 48, flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 6, elevation: 2, shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
    },
    textInput: {
        flex: 1, fontSize: 16, paddingVertical: 10,
        paddingHorizontal: 4, color: '#1F2937', maxHeight: 120,
    },
    sendBtn: {
        height: 48, width: 48, borderRadius: 24,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#F68537', elevation: 3,
        shadowColor: '#F68537', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4, shadowRadius: 3,
    },
});
