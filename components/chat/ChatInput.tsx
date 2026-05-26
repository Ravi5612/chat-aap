import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
    Alert,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';

import ReplyPreview from './ReplyPreview';

import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AttachmentMenu from './AttachmentMenu';
import AudioRecorder from './AudioRecorder';
import ContactPickerModal from './ContactPickerModal';
import EmojiPickerModal from './EmojiPickerModal';

import { useMediaPicker } from '@/hooks/chatInput/useMediaPicker';
import { useLocationPicker } from '@/hooks/chatInput/useLocationPicker';
import { useDocumentPicker } from '@/hooks/chatInput/useDocumentPicker';

interface ChatInputProps {
    onSendMessage: (text: string) => void;
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
    onSendMessage,
    onTyping,
    disabled = false,
    replyingTo,
    onCancelReply,
    editingMessage,
    onCancelEdit,
    onSaveEdit,
    isMember = true,
    isKeyboardOpen = false,
    initialMessage = '',
    onDraftChange
}: ChatInputProps) {
    const [message, setMessage] = useState(initialMessage);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [emojiModalVisible, setEmojiModalVisible] = useState(false);
    const insets = useSafeAreaInsets();
    const hasMeasured = insets.top > 0 || insets.bottom > 0;
    const safeBottom = hasMeasured ? insets.bottom : (initialWindowMetrics?.insets?.bottom || 0);
    const { handlePickImage, handleLaunchCamera } = useMediaPicker(setSelectedImage);
    const { handleLocation } = useLocationPicker(onSendMessage);
    const { handleDocument } = useDocumentPicker(onSendMessage);
    const inputRef = useRef<TextInput>(null);
    const typingTimeoutRef = useRef<any>(null);
    const draftTimeoutRef = useRef<any>(null);

    React.useEffect(() => {
        if (editingMessage) {
            setMessage(editingMessage.message);
            inputRef.current?.focus();
        } else if (replyingTo) {
            inputRef.current?.focus();
        }
    }, [editingMessage, replyingTo]);

    // Sync draft when loaded asynchronously
    React.useEffect(() => {
        if (initialMessage) {
            setMessage(initialMessage);
        }
    }, [initialMessage]);

    const lastSentTimeRef = useRef(0);

    const handleSubmit = () => {
        // Prevent accidental double taps on the mic button just after sending
        if (!message.trim() && !selectedImage) {
            if (Date.now() - lastSentTimeRef.current < 500) {
                return; // Ignore accidental mic taps immediately after sending
            }
            setIsRecording(true);
            return;
        }


        if (editingMessage && onSaveEdit) {
            onSaveEdit(message.trim());
        } else {
            let finalMessage = message.trim();
            if (selectedImage) {
                finalMessage = `[Image] ${selectedImage} ${message.trim()}`;
            }
            onSendMessage(finalMessage);
        }

        lastSentTimeRef.current = Date.now();
        setMessage('');
        setSelectedImage(null);
        
        // Clear draft timeout to prevent ghost draft restoring
        if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
        if (onDraftChange) onDraftChange(''); 
        
        if (onTyping) {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            onTyping(false);
        }
    };

    const handleRecordingComplete = (uri: string) => {
        onSendMessage(`[Voice Message] ${uri}`);
        setIsRecording(false);
    };

    const [contactModalVisible, setContactModalVisible] = useState(false);

    const handleContact = async () => {
        setContactModalVisible(true);
    };

    const handleSelectContact = (name: string, phone: string) => {
        onSendMessage(`[Contact] ${name} | ${phone}`);
    };

    const handleSelectEmoji = (emoji: string) => {
        setMessage(prev => prev + emoji);
    };

    const lastTypingSentRef = useRef(0);

    const handleChangeText = (text: string) => {
        setMessage(text);

        // Debounced Draft Save
        if (onDraftChange) {
            if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
            draftTimeoutRef.current = setTimeout(() => {
                onDraftChange(text);
            }, 500); // Save after 500ms of no typing
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
        <View style={{
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            // Jab keyboard open ho toh padding kam (5), jab band ho toh buttons ke liye zyada (20)
            paddingBottom: bottomPadding,
            position: 'relative'
        }}>

            {!isMember && (
                <View style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(249, 250, 251, 0.8)',
                    zIndex: 100,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 20
                }}>
                    <View style={{
                        backgroundColor: 'white',
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        elevation: 2,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4
                    }}>
                        <Text style={{ fontSize: 18 }}>🚫</Text>
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#6B7280' }}>
                            You are no longer a member of this group
                        </Text>
                    </View>
                </View>
            )}
            <View style={{ opacity: isMember ? 1 : 0.5, pointerEvents: isMember ? 'auto' : 'none' }}>
                {isRecording && (
                    <AudioRecorder
                        onRecordingComplete={handleRecordingComplete}
                        onCancel={() => setIsRecording(false)}
                    />
                )}

                <ReplyPreview replyingTo={replyingTo} onCancel={onCancelReply || (() => { })} />

                {editingMessage && (
                    <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FFF7ED', borderBottomWidth: 1, borderBottomColor: 'rgba(246, 133, 55, 0.3)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <View style={{ width: 4, height: 40, backgroundColor: '#F68537', borderRadius: 9999, marginRight: 12 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12, color: '#F68537', fontWeight: 'bold', marginBottom: 2 }}>Editing message...</Text>
                                <Text style={{ fontSize: 12, color: '#4B5563' }} numberOfLines={1}>{editingMessage.message}</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onCancelEdit} style={{ padding: 4 }}>
                            <Ionicons name="close-circle" size={20} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                )}

                {selectedImage && !isRecording && (
                    <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center' }}>
                        <Image source={{ uri: selectedImage as string }} style={{ width: 64, height: 64, borderRadius: 8, marginRight: 16 }} />
                        <TouchableOpacity onPress={() => setSelectedImage(null)} style={{ position: 'absolute', top: 4, left: 64, backgroundColor: '#EF4444', borderRadius: 9999 }}>
                            <Ionicons name="close" size={16} color="white" />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 12, color: '#6B7280', fontStyle: 'italic' }}>Image selected</Text>
                    </View>
                )}

                <View style={{
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    gap: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 10,
                    opacity: isRecording ? 0 : 1
                }}>
                    <View style={{
                        flex: 1,
                        backgroundColor: 'white',
                        borderRadius: 25,
                        minHeight: 48,
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 6,
                        elevation: 2,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.1,
                        shadowRadius: 2,
                    }}>
                        <TouchableOpacity
                            onPress={() => {
                                if (emojiModalVisible) {
                                    setEmojiModalVisible(false);
                                    inputRef.current?.focus();
                                } else {
                                    inputRef.current?.blur();
                                    setEmojiModalVisible(true);
                                }
                            }}
                            style={{ padding: 8 }}
                        >
                            <Ionicons name="happy-outline" size={26} color={emojiModalVisible ? "#F68537" : "#6B7280"} />
                        </TouchableOpacity>

                        <TextInput
                            ref={inputRef}
                            style={styles.textInput}
                            placeholder={editingMessage ? "Edit message..." : "Message"}
                            placeholderTextColor="#94A3B8"
                            value={message}
                            onChangeText={handleChangeText}
                            multiline
                            maxLength={1000}
                            editable={!disabled}
                        />

                        <AttachmentMenu
                            onImage={handlePickImage}
                            onCamera={handleLaunchCamera}
                            onLocation={handleLocation}
                            onContact={handleContact}
                            onDocument={handleDocument}
                        />

                        {!message.trim() && !selectedImage && (
                            <TouchableOpacity
                                onPress={handleLaunchCamera}
                                style={{ padding: 8 }}
                            >
                                <Ionicons name="camera" size={26} color="#6B7280" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity onPress={handleSubmit} disabled={disabled} style={styles.sendBtn}>
                        <Ionicons
                            name={editingMessage ? "checkmark" : (message.trim() || selectedImage ? "send" : "mic")}
                            size={24}
                            color="white"
                            style={{ marginLeft: (message.trim() || selectedImage) ? 3 : 0 }}
                        />
                    </TouchableOpacity>
                </View>

                {emojiModalVisible && (
                    <EmojiPickerModal
                        visible={emojiModalVisible}
                        onClose={() => {
                            setEmojiModalVisible(false);
                            inputRef.current?.focus();
                        }}
                        onSelect={handleSelectEmoji}
                        isInline={true}
                    />
                )}

                <ContactPickerModal
                    visible={contactModalVisible}
                    onClose={() => setContactModalVisible(false)}
                    onSelectContact={handleSelectContact}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({});
