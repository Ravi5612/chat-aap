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
            const finalMessage = selectedImage ? `[Image] ${message.trim()}` : message.trim();
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

    const handleChangeText = (text: string) => {
        setMessage(text);
        if (onTyping) {
            onTyping(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                onTyping(false);
            }, 2000);
        }
    };

    return (
        <View className="bg-white border-t border-gray-100 pb-8 relative">
            {isRecording && (
                <AudioRecorder
                    onRecordingComplete={handleRecordingComplete}
                    onCancel={() => setIsRecording(false)}
                />
            )}

            <ReplyPreview replyingTo={replyingTo} onCancel={onCancelReply || (() => { })} />

            {editingMessage && (
                <View className="px-4 py-2 bg-orange-50 border-b border-[#F68537]/30 flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                        <View className="w-1 h-10 bg-[#F68537] rounded-full mr-3" />
                        <View className="flex-1">
                            <Text className="text-xs text-[#F68537] font-bold mb-0.5">Editing message...</Text>
                            <Text className="text-xs text-gray-600 truncate" numberOfLines={1}>{editingMessage.message}</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={onCancelEdit} className="p-1">
                        <Ionicons name="close-circle" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                </View>
            )}

            {selectedImage && !isRecording && (
                <View className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex-row items-center">
                    <Image source={{ uri: selectedImage }} className="w-16 h-16 rounded-lg mr-4" />
                    <TouchableOpacity onPress={() => setSelectedImage(null)} className="absolute top-1 left-16 bg-red-500 rounded-full">
                        <Ionicons name="close" size={16} color="white" />
                    </TouchableOpacity>
                    <Text className="text-xs text-gray-500 italic">Image selected</Text>
                </View>
            )}

            <View className={`flex-row items-end gap-2 px-4 py-2 ${isRecording ? 'opacity-0' : ''}`}>
                <View className="flex-1 bg-gray-50 border border-gray-200 rounded-3xl px-2 py-2 min-h-[44px] flex-row items-center">
                    <AttachmentMenu
                        onImage={handlePickImage}
                        onLocation={handleLocation}
                        onContact={handleContact}
                        onDocument={() => Alert.alert("Coming soon")}
                    />

                    <TextInput
                        ref={inputRef}
                        className="flex-1 text-base py-1 text-gray-800"
                        placeholder={editingMessage ? "Edit message..." : "Type a message..."}
                        value={message}
                        onChangeText={handleChangeText}
                        multiline
                        maxLength={1000}
                        editable={!disabled}
                    />
                    <TouchableOpacity className="ml-2 pr-2">
                        <Ionicons name="happy-outline" size={24} color="#94a3b8" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={disabled}
                    className={`h-[44px] w-[44px] rounded-full items-center justify-center ${message.trim() || selectedImage ? 'bg-[#F68537]' : 'bg-gray-200'}`}
                >
                    <Ionicons
                        name={editingMessage ? "checkmark" : (message.trim() || selectedImage ? "send" : "mic")}
                        size={20}
                        color={message.trim() || selectedImage ? "white" : "#94a3b8"}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({});
