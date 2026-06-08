import { Ionicons } from '@expo/vector-icons';
import React, { useState, useCallback, memo } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, Text } from 'react-native';
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

// Extracted logic hooks
import { useVoiceTyping } from '@/hooks/chatInput/useVoiceTyping';
import { useMessageDraft } from '@/hooks/chatInput/useMessageDraft';
import { useChatModals } from '@/hooks/chatInput/useChatModals';

// Stable no-op to avoid inline arrow function allocation
const NOOP = () => {};

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

const ChatInput = memo(({
    onSendMessage, onTyping, disabled = false,
    replyingTo, onCancelReply, editingMessage, onCancelEdit, onSaveEdit,
    isMember = true, isKeyboardOpen = false, initialMessage = '', onDraftChange
}: ChatInputProps) => {
    const [selectedMedia, setSelectedMedia] = useState<{ uri: string, type: 'image' | 'video' } | null>(null);
    const [isRecording, setIsRecording] = useState(false);

    const insets = useSafeAreaInsets();
    const hasMeasured = insets.top > 0 || insets.bottom > 0;
    const safeBottom = hasMeasured ? insets.bottom : (initialWindowMetrics?.insets?.bottom || 0);

    const {
        emojiModalVisible, setEmojiModalVisible,
        contactModalVisible, openContacts, closeContacts,
        cameraModalVisible, openCamera, closeCamera,
        scheduleModalVisible, openSchedule, closeSchedule
    } = useChatModals();

    const {
        message, setMessage, handleChangeText, handleSubmit, inputRef
    } = useMessageDraft({
        initialMessage, editingMessage, replyingTo, onDraftChange, onTyping,
        onSendMessage, onSaveEdit, setIsRecording, selectedMedia, setSelectedMedia
    });

    const {
        isVoiceTyping, voiceLang, startVoiceTyping, stopVoiceTyping, toggleLang
    } = useVoiceTyping(setMessage);

    const onMediaPicked = useCallback((uri: string | null) => {
        setSelectedMedia(uri ? { uri, type: 'image' } : null);
    }, []);

    const { handlePickImage } = useMediaPicker(onMediaPicked);
    const { handleLocation } = useLocationPicker(onSendMessage);
    const { handleDocument } = useDocumentPicker(onSendMessage);

    // Stable callbacks for children
    const stopRecording      = useCallback(() => setIsRecording(false), []);
    const removeMedia        = useCallback(() => setSelectedMedia(null), []);
    const toggleEmoji        = useCallback(() => {
        if (emojiModalVisible) { setEmojiModalVisible(false); inputRef.current?.focus(); }
        else { inputRef.current?.blur(); setEmojiModalVisible(true); }
    }, [emojiModalVisible, setEmojiModalVisible, inputRef]);
    const closeEmoji         = useCallback(() => { setEmojiModalVisible(false); inputRef.current?.focus(); }, [setEmojiModalVisible, inputRef]);
    const appendEmoji        = useCallback((emoji: string) => setMessage(prev => prev + emoji), [setMessage]);
    const onRecordingComplete = useCallback((uri: string) => { onSendMessage(`[Voice Message] ${uri}`); setIsRecording(false); }, [onSendMessage]);
    const onContactSelected  = useCallback((name: string, phone: string) => onSendMessage(`[Contact] ${name} | ${phone}`), [onSendMessage]);
    const onCameraCapture    = useCallback((media: any) => setSelectedMedia(media), []);
    const onScheduleSubmit   = useCallback((date: Date) => handleSubmit(date), [handleSubmit]);
    const handleSendPress    = useCallback(() => handleSubmit(), [handleSubmit]);
    const handleLongPress    = useCallback(() => { if (!message.trim() && !selectedMedia) startVoiceTyping(); }, [message, selectedMedia, startVoiceTyping]);
    const handlePressOut     = useCallback(() => { if (isVoiceTyping) stopVoiceTyping(); }, [isVoiceTyping, stopVoiceTyping]);

    const bottomPadding = isKeyboardOpen ? 5 : (safeBottom > 0 ? safeBottom : 12);
    const hasContent = !!(message.trim() || selectedMedia);
    const sendIcon = editingMessage ? 'checkmark' : (hasContent ? 'send' : 'mic');

    return (
        <View style={[styles.wrapper, { paddingBottom: bottomPadding }]}>
            {!isMember && <NonMemberOverlay />}

            <View style={[styles.innerWrapper, !isMember && styles.disabled]}>
                {isRecording && (
                    <AudioRecorder
                        onRecordingComplete={onRecordingComplete}
                        onCancel={stopRecording}
                    />
                )}

                <ReplyPreview replyingTo={replyingTo} onCancel={onCancelReply ?? NOOP} />

                {editingMessage && (
                    <EditingBanner editingMessage={editingMessage} onCancelEdit={onCancelEdit} />
                )}

                {selectedMedia && !isRecording && (
                    <SelectedImagePreview
                        imageUri={selectedMedia.uri}
                        onRemove={removeMedia}
                        isVideo={selectedMedia.type === 'video'}
                    />
                )}

                <View style={[styles.inputRow, isRecording && styles.hidden]}>
                    <View style={styles.inputBubble}>
                        <TouchableOpacity onPress={toggleLang} style={styles.langBtn}>
                            <Text style={styles.langText}>{voiceLang === 'hi-IN' ? 'HI' : 'EN'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={toggleEmoji} style={styles.iconBtn}>
                            <Ionicons name="happy-outline" size={26} color={emojiModalVisible ? '#F68537' : '#6B7280'} />
                        </TouchableOpacity>

                        <TextInput
                            ref={inputRef}
                            style={styles.textInput}
                            placeholder={isVoiceTyping ? 'Listening...' : (editingMessage ? 'Edit message...' : 'Message')}
                            placeholderTextColor={isVoiceTyping ? '#F68537' : '#94A3B8'}
                            value={message}
                            onChangeText={handleChangeText}
                            multiline
                            maxLength={1000}
                            editable={!disabled && !isVoiceTyping}
                        />

                        <AttachmentMenu
                            onImage={handlePickImage}
                            onCamera={openCamera}
                            onLocation={handleLocation}
                            onContact={openContacts}
                            onDocument={handleDocument}
                            onSchedule={openSchedule}
                        />

                        {!hasContent && (
                            <TouchableOpacity onPress={openCamera} style={styles.iconBtn}>
                                <Ionicons name="camera" size={26} color="#6B7280" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity
                        onPress={handleSendPress}
                        onLongPress={handleLongPress}
                        onPressOut={handlePressOut}
                        disabled={disabled}
                        style={[styles.sendBtn, isVoiceTyping && styles.sendBtnRecording]}
                    >
                        <Ionicons
                            name={sendIcon}
                            size={24}
                            color="white"
                            style={hasContent ? styles.sendIconOffset : undefined}
                        />
                    </TouchableOpacity>
                </View>

                {emojiModalVisible && (
                    <EmojiPickerModal
                        visible={emojiModalVisible}
                        onClose={closeEmoji}
                        onSelect={appendEmoji}
                        isInline={true}
                    />
                )}

                <ContactPickerModal
                    visible={contactModalVisible}
                    onClose={closeContacts}
                    onSelectContact={onContactSelected}
                />

                <CustomCameraModal
                    visible={cameraModalVisible}
                    onClose={closeCamera}
                    onCapture={onCameraCapture}
                />

                <ScheduleMessageModal
                    visible={scheduleModalVisible}
                    onClose={closeSchedule}
                    onSchedule={onScheduleSubmit}
                />
            </View>
        </View>
    );
});

export default ChatInput;

const styles = StyleSheet.create({
    wrapper: { backgroundColor: 'transparent', borderTopWidth: 0, position: 'relative' },
    innerWrapper: { opacity: 1 },
    disabled: { opacity: 0.5 },
    hidden: { opacity: 0 },
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
    langBtn: { padding: 8, paddingRight: 4 },
    langText: { fontSize: 12, fontWeight: 'bold', color: '#F68537' },
    iconBtn: { padding: 8 },
    sendBtn: {
        height: 48, width: 48, borderRadius: 24,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#F68537', elevation: 3,
        shadowColor: '#F68537', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4, shadowRadius: 3,
    },
    sendBtnRecording: { backgroundColor: '#EF4444' },
    sendIconOffset: { marginLeft: 3 },
});
