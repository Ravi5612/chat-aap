import React, { RefObject } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, Text, StyleSheet, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BG_COLORS = ['#F68537', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#1E293B', '#FF4E50', '#000000'];

interface Props {
    content: string;
    setContent: (text: string) => void;
    bgColor: string;
    setBgColor: (color: string) => void;
    showEmojiPicker: boolean;
    setShowEmojiPicker: (show: boolean) => void;
    textInputRef: RefObject<TextInput>;
    paddingBottom: number;
}

export const TextStatusEditor: React.FC<Props> = ({
    content, setContent, bgColor, setBgColor, showEmojiPicker, setShowEmojiPicker, textInputRef, paddingBottom
}) => {
    return (
        <>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 30 }} keyboardShouldPersistTaps="handled">
                <TextInput
                    ref={textInputRef}
                    multiline
                    placeholder="Type your status..."
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    style={styles.textInput}
                    value={content}
                    onChangeText={setContent}
                    onFocus={() => setShowEmojiPicker(false)}
                    autoFocus
                    maxLength={250}
                />
            </ScrollView>

            <View style={[styles.footer, { paddingBottom }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 }}>
                    <TouchableOpacity onPress={() => { if (showEmojiPicker) { setShowEmojiPicker(false); textInputRef.current?.focus(); } else { Keyboard.dismiss(); setShowEmojiPicker(true); } }} style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: 20 }}>
                        <Ionicons name={showEmojiPicker ? "keypad-outline" : "happy-outline"} size={24} color="white" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.footerLabel}>Choose Background</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}>
                    {BG_COLORS.map(color => (
                        <TouchableOpacity key={color} onPress={() => setBgColor(color)} style={[styles.colorCircle, { backgroundColor: color, borderColor: bgColor === color ? 'white' : 'rgba(255,255,255,0.3)', borderWidth: bgColor === color ? 3 : 1 }]} />
                    ))}
                </ScrollView>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    textInput: { color: 'white', fontSize: 32, fontWeight: '900', textAlign: 'center', lineHeight: 40 },
    footer: { backgroundColor: 'rgba(0, 0, 0, 0.15)', paddingTop: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    footerLabel: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 16, letterSpacing: 1.5, textAlign: 'center' },
    colorCircle: { width: 48, height: 48, borderRadius: 24, marginHorizontal: 8, elevation: 2 },
});
