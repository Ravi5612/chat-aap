import React, { useState, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CallControlsProps {
    callState: 'incoming' | 'outgoing' | 'ringing' | 'active' | 'ended' | null;
    callType: 'audio' | 'video';
    isMuted: boolean;
    isVideoOff: boolean;
    isSpeakerphone: boolean;
    audioRoute?: number;
    isScreenSharing: boolean;
    onMute: () => void;
    onVideo: () => void;
    onSpeaker: () => void;
    onScreenShare: () => void;
    onAccept: () => void;
    onEnd: () => void;
    onRequestVideoUpgrade?: () => void;
}

export const CallControls = memo(({ 
    callState, callType, isMuted, isVideoOff, isSpeakerphone, audioRoute, isScreenSharing, 
    onMute, onVideo, onSpeaker, onScreenShare, onAccept, onEnd, onRequestVideoUpgrade
}: CallControlsProps) => {
    const [showMore, setShowMore] = useState(false);
    const [showAudioMenu, setShowAudioMenu] = useState(false);

    if (callState === 'incoming') {
        return (
            <View style={styles.controlsContainer}>
                <TouchableOpacity onPress={onEnd} style={[styles.controlButton, styles.largeButton, styles.dangerButton]}>
                    <Ionicons name="close" size={32} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={onAccept} style={[styles.controlButton, styles.largeButton, styles.successButton]}>
                    <Ionicons name="call" size={32} color="white" />
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.controlsContainer}>
            <TouchableOpacity 
                onPress={() => {
                    if (callType === 'audio') {
                        if (onRequestVideoUpgrade) onRequestVideoUpgrade();
                    } else {
                        onVideo();
                    }
                }} 
                style={[styles.controlButton, isVideoOff && { backgroundColor: 'rgba(255,255,255,0.4)' }]}
            >
                <Ionicons name={isVideoOff ? "videocam-off" : "videocam"} size={24} color={isVideoOff ? "#EF4444" : "white"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onMute} style={[styles.controlButton, isMuted && { backgroundColor: 'rgba(255,255,255,0.4)' }]}>
                <Ionicons name={isMuted ? "mic-off" : "mic"} size={24} color={isMuted ? "#EF4444" : "white"} />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={onSpeaker} style={[styles.controlButton, (audioRoute === 3 || isSpeakerphone) && { backgroundColor: 'rgba(255,255,255,0.4)' }]}>
                <Ionicons 
                    name={audioRoute === 5 ? "bluetooth" : (audioRoute === 3 || isSpeakerphone ? "volume-high" : "phone-portrait-outline")} 
                    size={24} 
                    color="white" 
                />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setShowMore(!showMore); setShowAudioMenu(false); }} style={[styles.controlButton, showMore && { backgroundColor: 'rgba(255,255,255,0.4)' }]}>
                <Ionicons name="ellipsis-vertical" size={24} color="white" />
            </TouchableOpacity>

            <TouchableOpacity onPress={onEnd} style={[styles.controlButton, styles.largeButton, styles.dangerButton]}>
                <Ionicons name="call" size={32} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>


            {/* MORE OPTIONS MENU */}
            {showMore && (
                <View style={styles.moreMenuContainer}>
                    {callType === 'video' && (
                        <TouchableOpacity onPress={() => { setShowMore(false); onScreenShare(); }} style={styles.moreMenuItem}>
                            <Ionicons name={isScreenSharing ? "stop-circle" : "desktop"} size={20} color={isScreenSharing ? "#EF4444" : "white"} />
                            <Text style={styles.moreMenuText}>{isScreenSharing ? "Stop Sharing" : "Share Screen"}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    controlsContainer: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
        backgroundColor: '#F68537', paddingHorizontal: 20, paddingVertical: 12,
        borderRadius: 40, elevation: 8, shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5,
    },
    controlButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    largeButton: { width: 60, height: 60, borderRadius: 30 },
    dangerButton: { backgroundColor: '#EF4444' },
    successButton: { backgroundColor: '#10B981' },
    moreMenuContainer: {
        position: 'absolute',
        bottom: 80,
        right: 40,
        backgroundColor: '#1F2937',
        borderRadius: 12,
        padding: 8,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        minWidth: 160,
    },
    moreMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    moreMenuText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
});
