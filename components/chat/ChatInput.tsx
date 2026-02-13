import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Image,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ReplyPreview from './ReplyPreview';

import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import AttachmentMenu from './AttachmentMenu';
import AudioRecorder from './AudioRecorder';

interface ChatInputProps {
    onSendMessage: (text: string) => void;
    onTyping?: (isTyping: boolean) => void;
    disabled?: boolean;
    replyingTo?: any;
    onCancelReply?: () => void;
    editingMessage?: any;
    onCancelEdit?: () => void;
    onSaveEdit?: (text: string) => void;
}

export default function ChatInput({
    onSendMessage,
    onTyping,
    disabled = false,
    replyingTo,
    onCancelReply,
    editingMessage,
    onCancelEdit,
    onSaveEdit
}: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const typingTimeoutRef = useRef<any>(null);

    React.useEffect(() => {
        if (editingMessage) {
            setMessage(editingMessage.message);
            inputRef.current?.focus();
        } else if (replyingTo) {
            inputRef.current?.focus();
        }
    }, [editingMessage, replyingTo]);

    const handleSubmit = () => {
        if (!message.trim() && !selectedImage) {
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

        setMessage('');
        setSelectedImage(null);
        if (onTyping) {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            onTyping(false);
        }
    };

    const handleRecordingComplete = (uri: string) => {
        onSendMessage(`[Voice Message] ${uri}`);
        setIsRecording(false);
    };

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    const handleLocation = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission denied', 'Allow location access to share your location.');
            return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const mapsUrl = `https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`;
        onSendMessage(`📍 Location: ${mapsUrl}`);
    };

    const handleContact = async () => {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === 'granted') {
            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
            });

            if (data.length > 0) {
                Alert.alert("Contact Shared", `Shared ${data[0].name}`);
                onSendMessage(`👤 Contact: ${data[0].name} (${data[0].phoneNumbers?.[0]?.number || 'N/A'})`);
            }
        }
    };

    const lastTypingSentRef = useRef(0);

    const handleChangeText = (text: string) => {
        setMessage(text);
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

    return (
        <View style={{ backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingBottom: 8, position: 'relative' }}>
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
                    <Image source={{ uri: selectedImage }} style={{ width: 64, height: 64, borderRadius: 8, marginRight: 16 }} />
                    <TouchableOpacity onPress={() => setSelectedImage(null)} style={{ position: 'absolute', top: 4, left: 64, backgroundColor: '#EF4444', borderRadius: 9999 }}>
                        <Ionicons name="close" size={16} color="white" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 12, color: '#6B7280', fontStyle: 'italic' }}>Image selected</Text>
                </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingVertical: 8, opacity: isRecording ? 0 : 1 }}>
                <View style={{ flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#F6853740', borderRadius: 30, paddingHorizontal: 4, paddingVertical: 4, minHeight: 48, flexDirection: 'row', alignItems: 'center' }}>
                    <AttachmentMenu
                        onImage={handlePickImage}
                        onLocation={handleLocation}
                        onContact={handleContact}
                        onDocument={() => Alert.alert("Coming soon")}
                    />

                    <TextInput
                        ref={inputRef}
                        style={{ flex: 1, fontSize: 16, paddingVertical: 8, paddingHorizontal: 8, color: '#1F2937' }}
                        placeholder={editingMessage ? "Edit message..." : "Message"}
                        placeholderTextColor="#94A3B8"
                        value={message}
                        onChangeText={handleChangeText}
                        multiline
                        maxLength={1000}
                        editable={!disabled}
                    />

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 12 }}>
                        <TouchableOpacity>
                            <Ionicons name="happy-outline" size={24} color="#94A3B8" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handlePickImage}>
                            <Ionicons name="camera-outline" size={24} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={disabled}
                    style={{
                        height: 48,
                        width: 48,
                        borderRadius: 24,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#F68537',
                        shadowColor: '#F68537',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 4
                    }}
                >
                    <Ionicons
                        name={editingMessage ? "checkmark" : (message.trim() || selectedImage ? "send" : "mic-outline")}
                        size={24}
                        color="white"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({});
