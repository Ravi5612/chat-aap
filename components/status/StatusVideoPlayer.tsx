import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';

interface StatusVideoPlayerProps {
    uri: string;
    videoRef: React.RefObject<any>;
    isPlaying: boolean;
    togglePlayback: () => void;
    duration: number;
    setDuration: (d: number) => void;
    trimStart: number;
    trimEnd: number;
    setTrimEnd: (d: number) => void;
    handleTouch: (evt: any) => void;
}

export default function StatusVideoPlayer({
    uri,
    videoRef,
    isPlaying,
    togglePlayback,
    duration,
    setDuration,
    trimStart,
    trimEnd,
    setTrimEnd,
    handleTouch
}: StatusVideoPlayerProps) {
    return (
        <View style={{ flex: 1 }}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={togglePlayback}
                style={{ flex: 1, position: 'relative' }}
            >
                <Video
                    ref={videoRef}
                    source={{ uri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={isPlaying}
                    isMuted={false}
                    isLooping={true}
                    useNativeControls={false}
                    onLoad={(status: any) => {
                        const dur = Math.round(status.durationMillis / 1000);
                        setDuration(dur);
                        setTrimEnd(Math.min(dur, 30));
                    }}
                    onPlaybackStatusUpdate={(status: any) => {
                        if (!status.isLoaded) return;
                        if (status.isPlaying && status.positionMillis >= trimEnd * 1000) {
                            videoRef.current?.setStatusAsync({ positionMillis: trimStart * 1000 });
                        }
                    }}
                />
                {!isPlaying && (
                    <View style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.15)'
                    }}>
                        <View style={{
                            width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)'
                        }}>
                            <Ionicons name="play" size={36} color="white" style={{ marginLeft: 4 }} />
                        </View>
                    </View>
                )}
            </TouchableOpacity>

            {/* Visual Video Trimmer Slider */}
            {duration > 0 && (
                <View style={{ position: 'absolute', bottom: 120, left: 20, right: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 'bold' }}>
                            Start: {Math.floor(trimStart / 60)}:{(trimStart % 60).toString().padStart(2, '0')}
                        </Text>
                        <Text style={{ color: '#F68537', fontSize: 12, fontWeight: '900' }}>
                            Trim: {trimEnd - trimStart}s chosen (Max 30s)
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 'bold' }}>
                            End: {Math.floor(trimEnd / 60)}:{(trimEnd % 60).toString().padStart(2, '0')}
                        </Text>
                    </View>
                    <View
                        style={{ height: 40, justifyContent: 'center' }}
                        onStartShouldSetResponder={() => true}
                        onResponderGrant={handleTouch}
                        onResponderMove={handleTouch}
                    >
                        {/* Background Track */}
                        <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, position: 'relative' }} />

                        {/* Selected Range Highlight */}
                        <View style={{
                            position: 'absolute',
                            left: `${(trimStart / duration) * 100}%`,
                            right: `${100 - (trimEnd / duration) * 100}%`,
                            height: 6, backgroundColor: '#F68537', borderRadius: 3
                        }} />

                        {/* Left Thumb */}
                        <View style={{
                            position: 'absolute', left: `${(trimStart / duration) * 100}%`,
                            marginLeft: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: 'white',
                            borderWidth: 2, borderColor: '#F68537', shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 3
                        }} />

                        {/* Right Thumb */}
                        <View style={{
                            position: 'absolute', left: `${(trimEnd / duration) * 100}%`,
                            marginLeft: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: 'white',
                            borderWidth: 2, borderColor: '#F68537', shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 3
                        }} />
                    </View>
                </View>
            )}
        </View>
    );
}
