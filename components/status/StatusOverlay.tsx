import React from 'react';
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Modal, FlatList, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';

interface StatusOverlayProps {
    statuses: any[];
    currentIndex: number;
    progress: number;
    currentStatusUI: any;
    insets: any;
    isOwner: boolean;
    paused: boolean;
    setPaused: (p: boolean) => void;
    isReplying: boolean;
    setIsReplying: (r: boolean) => void;
    replyText: string;
    setReplyText: (t: string) => void;
    handleSendReply: () => void;
    handleDeleteStatus: () => void;
    statusViewers: any[];
    showViewers: boolean;
    setShowViewers: (s: boolean) => void;
    height: number;
    allowStatusDownload?: boolean;
}

export default function StatusOverlay({
    statuses, currentIndex, progress, currentStatusUI, insets, isOwner, paused, setPaused,
    isReplying, setIsReplying, replyText, setReplyText, handleSendReply, handleDeleteStatus,
    statusViewers, showViewers, setShowViewers, height, allowStatusDownload
}: StatusOverlayProps) {
    const router = useRouter();
    const [downloading, setDownloading] = useState(false);

    if (!currentStatusUI) return null;

    const handleDownloadStatus = async () => {
        if (!currentStatusUI?.media_url) return;
        try {
            setDownloading(true);
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please allow gallery access to save media.');
                return;
            }
            const url = currentStatusUI.media_url;
            let assetUri = url;
            
            let cacheUriToClean = null;
            if (!url.startsWith('file://')) {
                const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
                const filename = `chatwarriors_status_${Date.now()}.${ext}`;
                const cacheUri = `${FileSystem.cacheDirectory}${filename}`;
                const result = await FileSystem.downloadAsync(url, cacheUri);
                if (result.status !== 200) throw new Error('Download failed');
                assetUri = result.uri;
                cacheUriToClean = cacheUri;
            }
            
            const asset = await MediaLibrary.createAssetAsync(assetUri);
            try {
                const album = await MediaLibrary.getAlbumAsync('ChatWarriors');
                if (!album) await MediaLibrary.createAlbumAsync('ChatWarriors', asset, false);
                else await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
            } catch (_) {}
            
            if (cacheUriToClean) {
                try { await FileSystem.deleteAsync(cacheUriToClean, { idempotent: true }); } catch (_) {}
            }
            Alert.alert('✅ Saved!', 'Status saved to your gallery!');
        } catch (err: any) {
            console.error('[STATUS DOWNLOAD] Error:', err);
            Alert.alert('Error', 'Could not save status. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <>
            {!paused && (
                <View style={{ position: 'absolute', top: insets.top + 10, left: 0, right: 0, paddingHorizontal: 16, zIndex: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
                        {statuses.map((_, index) => {
                            let barProgress = 0;
                            if (index < currentIndex) {
                                barProgress = 1;
                            } else if (index === currentIndex) {
                                barProgress = progress;
                            } else {
                                barProgress = 0;
                            }

                            return (
                                <View key={index} style={{ height: 3, flex: 1, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.25)', overflow: 'hidden' }}>
                                    <View style={{ height: '100%', width: `${barProgress * 100}%`, backgroundColor: 'white', borderRadius: 2 }} />
                                </View>
                            );
                        })}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Image
                                source={{ uri: currentStatusUI.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentStatusUI.profiles?.username || 'User')}&backgroundColor=F68537` }}
                                style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: 'white' }}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                            />
                            <View style={{ marginLeft: 12 }}>
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{currentStatusUI.profiles?.username || 'Unknown'}</Text>
                                <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 12 }}>
                                    {new Date(currentStatusUI.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {isOwner && (
                                <TouchableOpacity onPress={handleDeleteStatus} style={{ padding: 8, marginRight: 8 }}>
                                    <Ionicons name="trash-outline" size={24} color="#EF4444" />
                                </TouchableOpacity>
                            )}
                            {/* Download button - only show for non-owners when allowed */}
                            {!isOwner && allowStatusDownload && currentStatusUI?.media_type !== 'text' && (
                                <TouchableOpacity
                                    onPress={handleDownloadStatus}
                                    style={{ padding: 8, marginRight: 8 }}
                                    disabled={downloading}
                                >
                                    {downloading
                                        ? <ActivityIndicator size="small" color="white" />
                                        : <Ionicons name="download-outline" size={24} color="white" />
                                    }
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
                                <Ionicons name="close" size={32} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: Math.max(insets.bottom, 20) }}>
                {currentStatusUI.mentionedProfiles && currentStatusUI.mentionedProfiles.length > 0 && !paused && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                        {currentStatusUI.mentionedProfiles.map((profile: any, i: number) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                                <Image source={{ uri: profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.username || 'User')}` }} style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }}  cachePolicy="memory-disk" />
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>{profile.username}</Text>
                            </View>
                        ))}
                    </ScrollView>
                )}
                {isOwner ? (
                    !paused && (
                        <View style={{ alignItems: 'center' }}>
                            <TouchableOpacity
                                onPress={() => setShowViewers(true)}
                                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(246, 133, 55, 0.8)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30, gap: 8 }}
                            >
                                <Ionicons name="eye-outline" size={20} color="white" />
                                <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>{statusViewers.length} VIEWS</Text>
                            </TouchableOpacity>
                        </View>
                    )
                ) : (
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: 30, paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1.5, borderColor: '#F68537' }}>
                            <TextInput
                                placeholder="Reply to status..."
                                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                                style={{ flex: 1, color: 'white', fontSize: 15 }}
                                value={replyText}
                                onChangeText={setReplyText}
                                onFocus={() => { setIsReplying(true); setPaused(true); }}
                                onBlur={() => { setIsReplying(false); setPaused(false); }}
                            />
                            <TouchableOpacity 
                                style={{ marginLeft: 12, backgroundColor: '#F68537', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#F68537', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 }}
                                onPress={handleSendReply}
                                disabled={!replyText.trim()}
                            >
                                <Ionicons name="send" size={20} color="white" style={{ marginLeft: 3 }} />
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                )}
            </View>

            <Modal visible={showViewers} animationType="slide" transparent={true} onRequestClose={() => setShowViewers(false)}>
                <TouchableOpacity activeOpacity={1} onPress={() => setShowViewers(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: height * 0.6, padding: 24 }}>
                        <View style={{ width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <View>
                                <Text style={{ fontSize: 20, fontWeight: '900', color: '#1E293B' }}>Viewed by {statusViewers.length}</Text>
                                <Text style={{ fontSize: 12, color: '#94A3B8' }}>Only you can see this</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowViewers(false)}>
                                <Ionicons name="close-circle" size={28} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        {statusViewers.length > 0 ? (
                            <FlatList
                                data={statusViewers}
                                keyExtractor={(item) => item.id || item.viewer_id}
                                renderItem={({ item }) => (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                                        <Image
                                            source={{ uri: item.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.profiles?.username || 'User')}` }}
                                            style={{ width: 48, height: 48, borderRadius: 24 }}
                                         cachePolicy="memory-disk" />
                                        <View style={{ marginLeft: 16 }}>
                                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1E293B' }}>{item.profiles?.username || 'Unknown User'}</Text>
                                            <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                                                Viewed {new Date(item.viewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            />
                        ) : (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="eye-off-outline" size={64} color="#E2E8F0" />
                                <Text style={{ color: '#94A3B8', marginTop: 16, fontWeight: '600' }}>No viewers yet</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}
