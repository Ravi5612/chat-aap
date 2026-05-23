import React from 'react';
import { View, Text, Image } from 'react-native';
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
                    />
                )}
                {currentStatusUI.content && (
                    <View style={{ position: 'absolute', bottom: 120, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <Text style={{ color: 'white', fontSize: 16, textAlign: 'center', fontWeight: '500' }}>
                            {currentStatusUI.content}
                        </Text>
                    </View>
                )}
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
