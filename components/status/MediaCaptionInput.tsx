import React, { RefObject } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, Text, StyleSheet, Keyboard, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
    content: string;
    setContent: (text: string) => void;
    showEmojiPicker: boolean;
    setShowEmojiPicker: (show: boolean) => void;
    mediaInputRef: RefObject<TextInput>;
    paddingBottom: number;
    bottom: number;
    mentionedFriends: any[];
    handlePost: () => void;
    loading: boolean;
}

export const MediaCaptionInput: React.FC<Props> = ({
    content, setContent, showEmojiPicker, setShowEmojiPicker, mediaInputRef, paddingBottom, bottom, mentionedFriends, handlePost, loading
}) => {
    return (
        <View style={[styles.mediaInputContainer, { bottom, paddingBottom }]}>
            {/* Display Mentions Summary */}
            {mentionedFriends.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
                    {mentionedFriends.map((f, i) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: '#10B981' }}>
                            <Ionicons name="at" size={14} color="#10B981" />
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13, marginLeft: 2 }}>{f.name}</Text>
                        </View>
                    ))}
                </ScrollView>
            )}
            <View style={styles.inputWrapper}>
                <TouchableOpacity onPress={() => { if (showEmojiPicker) { setShowEmojiPicker(false); mediaInputRef.current?.focus(); } else { Keyboard.dismiss(); setShowEmojiPicker(true); } }} style={styles.iconBtn}>
                    <Ionicons name={showEmojiPicker ? "keyboard-outline" : "happy-outline"} size={24} color="white" />
                </TouchableOpacity>
                <TextInput
                    ref={mediaInputRef}
                    placeholder="Add a caption..."
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    style={styles.mediaTextInput}
                    value={content}
                    onChangeText={setContent}
                    onFocus={() => setShowEmojiPicker(false)}
                    multiline
                />
                <TouchableOpacity onPress={handlePost} disabled={loading} style={styles.sendBtn}>
                    {loading ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="send" size={20} color="white" />}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    mediaInputContainer: { position: 'absolute', left: 0, right: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.4)' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 30, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    iconBtn: { padding: 6 },
    mediaTextInput: { flex: 1, color: 'white', fontSize: 16, maxHeight: 100, paddingHorizontal: 10 },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F68537', alignItems: 'center', justifyContent: 'center' }
});
