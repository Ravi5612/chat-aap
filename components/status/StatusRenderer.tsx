import React from 'react';
import { View, Text} from 'react-native';
import { Image } from 'expo-image';
import { ResizeMode, Video } from 'expo-av';

interface StatusRendererProps {
    currentStatusUI: any;
    viewerVideoRef: React.RefObject<any>;
    onViewerPlaybackStatusUpdate: (status: any) => void;
}

export default function StatusRenderer({
    currentStatusUI,
    viewerVideoRef,
    onViewerPlaybackStatusUpdate
}: StatusRendererProps) {
    if (!currentStatusUI) return null;

    if (currentStatusUI.media_type !== 'text') {
        return (
            <View style={{ flex: 1 }}>
                {currentStatusUI.media_type === 'video' ? (
                    <Video
                        ref={viewerVideoRef}
                        source={{ uri: currentStatusUI.media_url }}
                        rate={1.0}
                        volume={1.0}
                        isMuted={false}
                        resizeMode={ResizeMode.CONTAIN}
                        shouldPlay={true}
                        isLooping={true}
                        onPlaybackStatusUpdate={onViewerPlaybackStatusUpdate}
                        style={{ width: '100%', height: '100%' }}
                    />
                ) : (
                    <Image
                        source={{ uri: currentStatusUI.media_url }}
                        style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                     cachePolicy="memory-disk" />
                )}
                {currentStatusUI.content && (
                    <View style={{ position: 'absolute', bottom: 120, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <Text style={{ color: 'white', fontSize: 16, textAlign: 'center', fontWeight: '500' }}>
                            {currentStatusUI.content}
                        </Text>
                    </View>
                )}
                
                {/* Music Sticker */}
                {currentStatusUI.audio_url && (() => {
                    try {
                        const music = JSON.parse(currentStatusUI.audio_url);
                        if (!music.title) return null;
                        return (
                            <View style={{ position: 'absolute', top: 120, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 24, padding: 6, flexDirection: 'row', alignItems: 'center', width: 200, zIndex: 10 }}>
                                <Image source={{ uri: music.cover }} style={{ width: 40, height: 40, borderRadius: 20 }}  cachePolicy="memory-disk" />
                                <View style={{ marginLeft: 8, flex: 1 }}>
                                    <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }} numberOfLines={1}>{music.title}</Text>
                                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }} numberOfLines={1}>{music.artist}</Text>
                                </View>
                            </View>
                        );
                    } catch(e) { return null; }
                })()}
            </View>
        );
    }

    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: currentStatusUI.background_color || '#F68537' }}>
            <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold', textAlign: 'center' }}>
                {currentStatusUI.content}
            </Text>
        </View>
    );
}
