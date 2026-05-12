import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, StyleSheet, Image, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { uploadChatMessageMedia } from '@/utils/uploadHelper';
import EmojiPickerModal from '@/components/chat/EmojiPickerModal';

const { width, height } = Dimensions.get('window');
const BG_COLORS = ['#F68537', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#1E293B', '#FF4E50', '#000000'];

export default function AddStatus() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [content, setContent] = useState('');
    const [bgColor, setBgColor] = useState(BG_COLORS[0]);
    const [loading, setLoading] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<any>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [privacy, setPrivacy] = useState<'all' | 'selected'>('all');
    const [selectedViewerIds, setSelectedViewerIds] = useState<string[]>([]);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showFriendPicker, setShowFriendPicker] = useState(false);
    const { friends } = (require('@/hooks/useFriends').useFriends)();

    const pickMedia = async () => {
        try {
            // Check permission first
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
            });

            if (!result.canceled) {
                setSelectedMedia(result.assets[0]);
            }
        } catch (error) {
            console.error('PickMedia Error:', error);
            Alert.alert('Error', 'Failed to open gallery');
        }
    };

    const handlePost = async () => {
        if (!content.trim() && !selectedMedia) return;
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not logged in');

            let mediaUrl = null;
            let mediaType = 'text';

            if (selectedMedia) {
                const isVideo = selectedMedia.type === 'video' || (selectedMedia.uri && selectedMedia.uri.toLowerCase().endsWith('.mp4'));
                const uploadResult = await uploadChatMessageMedia(
                    selectedMedia.uri, 
                    isVideo ? 'video' : 'image',
                    user.id
                );
                mediaUrl = uploadResult.url;
                mediaType = isVideo ? 'video' : 'image';
            }

            const { encryptText, getChatKey } = await import('@/utils/chatCrypto');
            // For status, we use a self-encryption key so only authorized clients can read it
            const statusKey = await getChatKey(user.id, user.id); 

            const encryptedContent = content.trim() ? await encryptText(content.trim(), statusKey) : null;
            const encryptedMediaUrl = mediaUrl ? await encryptText(mediaUrl, statusKey) : null;

            const statusData = {
                user_id: user.id,
                content: encryptedContent,
                media_type: mediaType,
                media_url: encryptedMediaUrl,
                background_color: selectedMedia ? null : bgColor,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                is_deleted: false,
                privacy_type: privacy,
                viewer_ids: privacy === 'selected' ? selectedViewerIds : null
            };

            const { error } = await supabase.from('statuses').insert([statusData]);
            if (error) throw error;
            router.back();
        } catch (error: any) {
            console.error('AddStatus Error:', error);
            Alert.alert('Error', 'Failed to post status');
        } finally {
            setLoading(false);
        }
    };

    const onEmojiSelect = (emoji: string) => {
        setContent(prev => prev + emoji);
    };

    return (
        <View style={{ flex: 1, backgroundColor: selectedMedia ? 'black' : bgColor }}>
            {/* Header */}
            <View style={{ 
                paddingTop: insets.top + 10, 
                paddingHorizontal: 20, 
                paddingBottom: 15,
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                zIndex: 10,
                backgroundColor: selectedMedia ? 'rgba(0,0,0,0.3)' : 'transparent'
            }}>
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={styles.headerIconButton}
                >
                    <Ionicons name="close" size={28} color="white" />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity 
                        onPress={() => setShowPrivacyModal(true)}
                        style={[styles.headerIconButton, { width: 'auto', paddingHorizontal: 12, gap: 6, flexDirection: 'row' }]}
                    >
                        <Ionicons name={privacy === 'all' ? "people-outline" : "person-add-outline"} size={20} color="white" />
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                            {privacy === 'all' ? 'All Friends' : `${selectedViewerIds.length} Selected`}
                        </Text>
                    </TouchableOpacity>

                    {!selectedMedia && (
                        <TouchableOpacity 
                            onPress={pickMedia}
                            style={styles.headerIconButton}
                        >
                            <Ionicons name="images-outline" size={24} color="white" />
                        </TouchableOpacity>
                    )}
                    
                    {!selectedMedia && (
                        <TouchableOpacity
                            onPress={handlePost}
                            disabled={loading || (!content.trim() && !selectedMedia)}
                            style={[
                                styles.postButton,
                                { opacity: (!content.trim() || loading) ? 0.6 : 1 }
                            ]}
                        >
                            {loading ? (
                                <ActivityIndicator color={bgColor} size="small" />
                            ) : (
                                <Text style={[styles.postButtonText, { color: bgColor }]}>Post</Text>
                            )}
                        </TouchableOpacity>
                    )}

                    {selectedMedia && (
                        <TouchableOpacity 
                            onPress={() => setSelectedMedia(null)}
                            style={styles.headerIconButton}
                        >
                            <Ionicons name="trash-outline" size={24} color="#EF4444" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                {selectedMedia ? (
                    <View style={{ flex: 1 }}>
                        <Image 
                            source={{ uri: selectedMedia.uri }} 
                            style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                        />
                        
                        {/* Premium Bottom Input Bar for Media */}
                        <View style={[styles.mediaInputContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                            <View style={styles.inputWrapper}>
                                <TouchableOpacity 
                                    onPress={() => setShowEmojiPicker(true)}
                                    style={styles.iconBtn}
                                >
                                    <Ionicons name="happy-outline" size={24} color="white" />
                                </TouchableOpacity>
                                
                                <TextInput
                                    placeholder="Add a caption..."
                                    placeholderTextColor="rgba(255,255,255,0.6)"
                                    style={styles.mediaTextInput}
                                    value={content}
                                    onChangeText={setContent}
                                    multiline
                                />

                                <TouchableOpacity 
                                    onPress={handlePost}
                                    disabled={loading}
                                    style={styles.sendBtn}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <Ionicons name="send" size={20} color="white" />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                ) : (
                    <>
                        <ScrollView 
                            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 30 }}
                            keyboardShouldPersistTaps="handled"
                        >
                            <TextInput
                                multiline
                                placeholder="Type your status..."
                                placeholderTextColor="rgba(255,255,255,0.4)"
                                style={styles.textInput}
                                value={content}
                                onChangeText={setContent}
                                autoFocus
                                maxLength={250}
                            />
                        </ScrollView>

                        {/* Color Selection & Footer */}
                        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) + 10 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 }}>
                                <TouchableOpacity 
                                    onPress={() => setShowEmojiPicker(true)}
                                    style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: 20 }}
                                >
                                    <Ionicons name="happy-outline" size={24} color="white" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.footerLabel}>Choose Background</Text>
                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}
                            >
                                {BG_COLORS.map((color) => (
                                    <TouchableOpacity
                                        key={color}
                                        onPress={() => setBgColor(color)}
                                        style={[
                                            styles.colorCircle,
                                            { 
                                                backgroundColor: color,
                                                borderColor: bgColor === color ? 'white' : 'rgba(255,255,255,0.3)',
                                                borderWidth: bgColor === color ? 3 : 1
                                            }
                                        ]}
                                    />
                                ))}
                            </ScrollView>
                        </View>
                    </>
                )}
            </KeyboardAvoidingView>

            <EmojiPickerModal 
                visible={showEmojiPicker}
                onClose={() => setShowEmojiPicker(false)}
                onSelect={(emoji) => {
                    onEmojiSelect(emoji);
                }}
            />

            {/* Privacy Modal */}
            {showPrivacyModal && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, justifyContent: 'flex-end' }]}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowPrivacyModal(false)} />
                    <View style={{ backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: insets.bottom + 20 }}>
                        <Text style={{ fontSize: 20, fontWeight: '900', color: '#1E293B', marginBottom: 8 }}>Status Privacy</Text>
                        <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>Who can see your status updates?</Text>
                        
                        <TouchableOpacity 
                            onPress={() => {
                                setPrivacy('all');
                                setShowPrivacyModal(false);
                            }}
                            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}
                        >
                            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="people" size={20} color="#3B82F6" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 16 }}>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1E293B' }}>All Friends</Text>
                                <Text style={{ fontSize: 12, color: '#94A3B8' }}>Share with all your contacts</Text>
                            </View>
                            {privacy === 'all' && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
                        </TouchableOpacity>

                        <TouchableOpacity 
                            onPress={() => {
                                setPrivacy('selected');
                                setShowPrivacyModal(false);
                                setShowFriendPicker(true);
                            }}
                            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16 }}
                        >
                            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="person-add" size={20} color="#10B981" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 16 }}>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1E293B' }}>Only Share With...</Text>
                                <Text style={{ fontSize: 12, color: '#94A3B8' }}>Select specific friends</Text>
                            </View>
                            {privacy === 'selected' && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Friend Picker Modal */}
            {showFriendPicker && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'white', zIndex: 200, paddingTop: insets.top }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                        <TouchableOpacity onPress={() => setShowFriendPicker(false)}>
                            <Ionicons name="arrow-back" size={24} color="#1E293B" />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1E293B' }}>Select Friends</Text>
                        <TouchableOpacity onPress={() => setShowFriendPicker(false)}>
                            <Text style={{ color: '#F68537', fontWeight: 'bold' }}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView style={{ flex: 1 }}>
                        {friends.map((friend: any) => (
                            <TouchableOpacity 
                                key={friend.id}
                                onPress={() => {
                                    if (selectedViewerIds.includes(friend.id)) {
                                        setSelectedViewerIds(prev => prev.filter(id => id !== friend.id));
                                    } else {
                                        setSelectedViewerIds(prev => [...prev, friend.id]);
                                    }
                                }}
                                style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' }}
                            >
                                <Image 
                                    source={{ uri: friend.img }}
                                    style={{ width: 44, height: 44, borderRadius: 22 }}
                                />
                                <Text style={{ flex: 1, marginLeft: 16, fontSize: 16, fontWeight: '600' }}>{friend.name}</Text>
                                <Ionicons 
                                    name={selectedViewerIds.includes(friend.id) ? "checkbox" : "square-outline"} 
                                    size={24} 
                                    color={selectedViewerIds.includes(friend.id) ? "#F68537" : "#CBD5E1"} 
                                />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    headerIconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    postButton: {
        backgroundColor: 'white',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        justifyContent: 'center'
    },
    postButtonText: {
        fontWeight: 'bold',
        fontSize: 14
    },
    textInput: {
        color: 'white',
        fontSize: 32,
        fontWeight: '900',
        textAlign: 'center',
        lineHeight: 40
    },
    footer: {
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
        paddingTop: 20,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30
    },
    footerLabel: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 16,
        letterSpacing: 1.5,
        textAlign: 'center'
    },
    colorCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginHorizontal: 8,
        elevation: 2
    },
    mediaInputContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: 'rgba(0,0,0,0.4)'
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 30,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    iconBtn: {
        padding: 6
    },
    mediaTextInput: {
        flex: 1,
        color: 'white',
        fontSize: 16,
        maxHeight: 100,
        paddingHorizontal: 10
    },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F68537',
        alignItems: 'center',
        justifyContent: 'center'
    }
});
