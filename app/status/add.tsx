import React, { useState, useRef } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, TextInput, TouchableOpacity, Text, StyleSheet, Keyboard, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

// Custom Hooks
import { useVideoTrimmer } from '@/hooks/useVideoTrimmer';
import { useStatusPost } from '@/hooks/useStatusPost';

// Components
import StatusHeader from '@/components/status/StatusHeader';
import StatusVideoPlayer from '@/components/status/StatusVideoPlayer';
import StatusModals from '@/components/status/StatusModals';
import MusicPicker from '@/components/status/MusicPicker';

const BG_COLORS = ['#F68537', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#1E293B', '#FF4E50', '#000000'];

export default function AddStatus() {
    const insets = useSafeAreaInsets();
    
    // Core State
    const [content, setContent] = useState('');
    const [bgColor, setBgColor] = useState(BG_COLORS[0]);
    const [selectedMedia, setSelectedMedia] = useState<any>(null);
    const [privacy, setPrivacy] = useState<'all' | 'selected'>('all');
    const [selectedViewerIds, setSelectedViewerIds] = useState<string[]>([]);
    const [selectedMusic, setSelectedMusic] = useState<any>(null);
    
    // UI Modals State
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showFriendPicker, setShowFriendPicker] = useState(false);
    const [showMusicPicker, setShowMusicPicker] = useState(false);
    
    // References
    const mediaInputRef = useRef<TextInput>(null);
    const textInputRef = useRef<TextInput>(null);

    // Friend list loader
    const { friends } = (require('@/hooks/useFriends').useFriends)();

    // Custom Hooks
    const { 
        videoRef, isPlaying, setIsPlaying, duration, setDuration, 
        trimStart, setTrimStart, trimEnd, setTrimEnd, togglePlayback, handleTouch 
    } = useVideoTrimmer();

    const { handlePost, loading } = useStatusPost(
        content, selectedMedia, bgColor, privacy, selectedViewerIds, duration, trimStart, trimEnd, selectedMusic
    );

    const pickMedia = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Please allow gallery access to post a status.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images', 'videos'],
                allowsEditing: true,
                aspect: [9, 16],
                quality: 0.8,
                videoMaxDuration: 30, 
            });

            if (!result.canceled) {
                setSelectedMedia(result.assets[0]);
            }
        } catch (error) {
            console.error('PickMedia Error:', error);
            Alert.alert('Error', 'Failed to open gallery');
        }
    };

    const isVideo = selectedMedia?.type === 'video' || selectedMedia?.uri?.toLowerCase().endsWith('.mp4');

    return (
        <View style={{ flex: 1, backgroundColor: selectedMedia ? 'black' : bgColor }}>
            <StatusHeader
                insetsTop={insets.top}
                privacy={privacy}
                selectedViewerCount={selectedViewerIds.length}
                setShowPrivacyModal={setShowPrivacyModal}
                selectedMedia={selectedMedia}
                pickMedia={pickMedia}
                handlePost={handlePost}
                loading={loading}
                content={content}
                bgColor={bgColor}
                onDeleteMedia={() => {
                    setSelectedMedia(null);
                    setIsPlaying(true);
                    setDuration(0);
                    setTrimStart(0);
                    setTrimEnd(30);
                }}
            />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                {selectedMedia ? (
                    <View style={{ flex: 1 }}>
                        {isVideo ? (
                            <StatusVideoPlayer
                                uri={selectedMedia.uri}
                                videoRef={videoRef}
                                isPlaying={isPlaying}
                                togglePlayback={togglePlayback}
                                duration={duration}
                                setDuration={setDuration}
                                trimStart={trimStart}
                                trimEnd={trimEnd}
                                setTrimEnd={setTrimEnd}
                                handleTouch={handleTouch}
                            />
                        ) : (
                            <View style={{ flex: 1 }}>
                                <Image source={{ uri: selectedMedia.uri }} style={{ width: '100%', height: '100%', contentFit: 'contain' }} />
                                
                                {/* Music Sticker */}
                                {selectedMusic && (
                                    <View style={styles.musicSticker}>
                                        <Image source={{ uri: selectedMusic.cover }} style={styles.musicStickerCover} />
                                        <View style={{ marginLeft: 8, flex: 1 }}>
                                            <Text style={styles.musicStickerTitle} numberOfLines={1}>{selectedMusic.title}</Text>
                                            <Text style={styles.musicStickerArtist} numberOfLines={1}>{selectedMusic.artist}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => setSelectedMusic(null)} style={{ padding: 4 }}>
                                            <Ionicons name="close-circle" size={20} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}

                        <View style={[styles.mediaInputContainer, { bottom: showEmojiPicker ? 280 : 0, paddingBottom: showEmojiPicker ? 10 : Math.max(insets.bottom, 20) }]}>
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
                                {!isVideo && (
                                    <TouchableOpacity onPress={() => setShowMusicPicker(true)} style={styles.musicBtn}>
                                        <Ionicons name="musical-notes" size={20} color={selectedMusic ? "#F68537" : "white"} />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={handlePost} disabled={loading} style={styles.sendBtn}>
                                    {loading ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="send" size={20} color="white" />}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                ) : (
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

                        <View style={[styles.footer, { paddingBottom: showEmojiPicker ? 290 : Math.max(insets.bottom, 20) + 10 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 }}>
                                <TouchableOpacity onPress={() => { if (showEmojiPicker) { setShowEmojiPicker(false); textInputRef.current?.focus(); } else { Keyboard.dismiss(); setShowEmojiPicker(true); } }} style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: 20 }}>
                                    <Ionicons name={showEmojiPicker ? "keyboard-outline" : "happy-outline"} size={24} color="white" />
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
                )}
            </KeyboardAvoidingView>

            <StatusModals
                showEmojiPicker={showEmojiPicker}
                setShowEmojiPicker={setShowEmojiPicker}
                onEmojiSelect={(e) => setContent(c => c + e)}
                showPrivacyModal={showPrivacyModal}
                setShowPrivacyModal={setShowPrivacyModal}
                privacy={privacy}
                setPrivacy={setPrivacy}
                setShowFriendPicker={setShowFriendPicker}
                showFriendPicker={showFriendPicker}
                friends={friends}
                selectedViewerIds={selectedViewerIds}
                setSelectedViewerIds={setSelectedViewerIds}
                insetsTop={insets.top}
                insetsBottom={insets.bottom}
            />

            <MusicPicker 
                visible={showMusicPicker} 
                onClose={() => setShowMusicPicker(false)} 
                onSelectMusic={setSelectedMusic} 
            />
        </View>
    );
}

const styles = StyleSheet.create({
    textInput: { color: 'white', fontSize: 32, fontWeight: '900', textAlign: 'center', lineHeight: 40 },
    footer: { backgroundColor: 'rgba(0, 0, 0, 0.15)', paddingTop: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    footerLabel: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 16, letterSpacing: 1.5, textAlign: 'center' },
    colorCircle: { width: 48, height: 48, borderRadius: 24, marginHorizontal: 8, elevation: 2 },
    mediaInputContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.4)' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 30, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    iconBtn: { padding: 6 },
    mediaTextInput: { flex: 1, color: 'white', fontSize: 16, maxHeight: 100, paddingHorizontal: 10 },
    musicBtn: { padding: 8, marginRight: 8 },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F68537', alignItems: 'center', justifyContent: 'center' },
    musicSticker: { position: 'absolute', top: 50, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 24, padding: 6, flexDirection: 'row', alignItems: 'center', width: 200 },
    musicStickerCover: { width: 40, height: 40, borderRadius: 20 },
    musicStickerTitle: { color: 'white', fontSize: 14, fontWeight: 'bold' },
    musicStickerArtist: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
});
