import React, { useState, useRef } from 'react';
import { View, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { TextInput } from 'react-native';

// Custom Hooks
import { useVideoTrimmer } from '@/hooks/useVideoTrimmer';
import { useStatusPost } from '@/hooks/useStatusPost';
import { useStatusMusic } from '@/hooks/status/useStatusMusic';
import { useFriends } from '@/hooks/useFriends';

// Components
import StatusHeader from '@/components/status/StatusHeader';
import StatusVideoPlayer from '@/components/status/StatusVideoPlayer';
import StatusModals from '@/components/status/StatusModals';
import MusicPicker from '@/components/status/MusicPicker';
import MentionPickerModal from '@/components/status/MentionPickerModal';
import { MusicPreviewSticker } from '@/components/status/MusicPreviewSticker';
import { TextStatusEditor } from '@/components/status/TextStatusEditor';
import { MediaCaptionInput } from '@/components/status/MediaCaptionInput';

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
    const [showMentionPicker, setShowMentionPicker] = useState(false);
    const [mentionedFriends, setMentionedFriends] = useState<any[]>([]);
    
    // References
    const mediaInputRef = useRef<TextInput>(null);
    const textInputRef = useRef<TextInput>(null);

    // Friend list loader
    const { friends } = useFriends();

    const { isMusicPlaying, musicProgress, musicPosition, musicDuration, toggleMusic } = useStatusMusic(selectedMusic);

    // Custom Hooks
    const { 
        videoRef, isPlaying, setIsPlaying, duration, setDuration, 
        trimStart, setTrimStart, trimEnd, setTrimEnd, togglePlayback, handleTouch 
    } = useVideoTrimmer();

    const { handlePost, loading } = useStatusPost(
        content, selectedMedia, bgColor, privacy, selectedViewerIds, duration, trimStart, trimEnd, selectedMusic, mentionedFriends
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
                                <Image source={{ uri: selectedMedia.uri }} style={{ width: '100%', height: '100%', contentFit: 'contain' }}  cachePolicy="memory-disk" />
                                
                                <MusicPreviewSticker
                                    selectedMusic={selectedMusic}
                                    isMusicPlaying={isMusicPlaying}
                                    musicProgress={musicProgress}
                                    musicPosition={musicPosition}
                                    musicDuration={musicDuration}
                                    toggleMusic={toggleMusic}
                                    onClearMusic={() => setSelectedMusic(null)}
                                    onPositionChange={(x, y) => setSelectedMusic((prev: any) => ({ ...prev, x, y }))}
                                />

                                {/* Music Picker Button at Top Right */}
                                <TouchableOpacity 
                                    onPress={() => setShowMusicPicker(true)} 
                                    style={{ position: 'absolute', top: 20, right: 20, backgroundColor: '#F68537', padding: 12, borderRadius: 24 }}
                                >
                                    <Ionicons name="musical-notes" size={24} color="white" />
                                </TouchableOpacity>

                                {/* Mention Button Below Music */}
                                <TouchableOpacity 
                                    onPress={() => setShowMentionPicker(true)} 
                                    style={{ position: 'absolute', top: 76, right: 20, backgroundColor: '#F68537', padding: 12, borderRadius: 24 }}
                                >
                                    <Ionicons name="at" size={24} color="white" />
                                </TouchableOpacity>
                            </View>
                        )}

                        <MediaCaptionInput
                            content={content}
                            setContent={setContent}
                            showEmojiPicker={showEmojiPicker}
                            setShowEmojiPicker={setShowEmojiPicker}
                            mediaInputRef={mediaInputRef}
                            bottom={showEmojiPicker ? 280 : 0}
                            paddingBottom={showEmojiPicker ? 10 : Math.max(insets.bottom, 20)}
                            mentionedFriends={mentionedFriends}
                            handlePost={handlePost}
                            loading={loading}
                        />
                    </View>
                ) : (
                    <TextStatusEditor
                        content={content}
                        setContent={setContent}
                        bgColor={bgColor}
                        setBgColor={setBgColor}
                        showEmojiPicker={showEmojiPicker}
                        setShowEmojiPicker={setShowEmojiPicker}
                        textInputRef={textInputRef}
                        paddingBottom={showEmojiPicker ? 290 : Math.max(insets.bottom, 20) + 10}
                    />
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

            <MentionPickerModal
                visible={showMentionPicker}
                onClose={() => setShowMentionPicker(false)}
                friends={friends}
                mentionedFriends={mentionedFriends}
                setMentionedFriends={setMentionedFriends}
                insetsTop={insets.top}
            />
        </View>
    );
}

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
