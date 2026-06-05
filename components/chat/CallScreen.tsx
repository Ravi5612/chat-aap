import React, { useState, useCallback, useMemo, memo } from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, Modal, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import AgoraVideoView from './AgoraVideoView';
import { useAgora } from '@/hooks/useAgora';
import { useWindowDimensions } from 'react-native';
import { useCallActions } from '@/hooks/useCallActions';
import { CallEndedOverlay } from './CallScreenComponents';

const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Memoized so re-renders from timer/state don't recreate controls
const CallControls = memo(({ callState, callType, isMuted, isVideoOff, isSpeakerphone, onMute, onVideo, onSpeaker, onSwitchCamera, onAccept, onEnd }: any) => {
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
            {callType === 'video' && (
                <TouchableOpacity onPress={onSwitchCamera} style={styles.controlButton}>
                    <Ionicons name="camera-reverse" size={24} color="white" />
                </TouchableOpacity>
            )}
            {callType === 'video' && (
                <TouchableOpacity onPress={onVideo} style={[styles.controlButton, isVideoOff && { backgroundColor: 'rgba(255,255,255,0.4)' }]}>
                    <Ionicons name={isVideoOff ? "videocam-off" : "videocam"} size={24} color="white" />
                </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onMute} style={[styles.controlButton, isMuted && { backgroundColor: 'rgba(255,255,255,0.4)' }]}>
                <Ionicons name={isMuted ? "mic-off" : "mic"} size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onSpeaker} style={[styles.controlButton, isSpeakerphone && { backgroundColor: 'rgba(255,255,255,0.4)' }]}>
                <Ionicons name={isSpeakerphone ? "volume-high" : "volume-medium"} size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onEnd} style={[styles.controlButton, styles.largeButton, styles.dangerButton]}>
                <Ionicons name="call" size={32} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
        </View>
    );
});


interface CallScreenProps {
    visible: boolean;
    callState: 'incoming' | 'outgoing' | 'ringing' | 'active' | 'ended';
    onEndCall: () => void;
    onAcceptCall: () => void;
    onRetry?: () => void;
    onMinimize?: () => void;
    currentUser: any;
    callType: 'audio' | 'video';
    friend: any;
    offer?: any;
    isGroup?: boolean;
    endReason?: string;
}

export default function CallScreen({
    visible, callState, onEndCall, onAcceptCall, onRetry, onMinimize,
    currentUser, callType, friend, offer: incomingOffer, isGroup = false, endReason
}: CallScreenProps) {
    const { width, height } = useWindowDimensions();
    const [isSwapped, setIsSwapped] = useState(false);
    const [showControls, setShowControls] = useState(true);

    // Draggable PIP
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const offsetX = useSharedValue(0);
    const offsetY = useSharedValue(0);

    // Memoize gesture so it's not recreated every render
    const panGesture = useMemo(() => Gesture.Pan()
        .onUpdate((event) => {
            translateX.value = offsetX.value + event.translationX;
            translateY.value = offsetY.value + event.translationY;
        })
        .onEnd(() => {
            offsetX.value = translateX.value;
            offsetY.value = translateY.value;
        }),
    [translateX, translateY, offsetX, offsetY]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: withSpring(translateX.value, { damping: 15 }) },
            { translateY: withSpring(translateY.value, { damping: 15 }) },
        ],
    }));

    // Agora RTC
    const { joined, remoteUids, connectionStatus, isMuted, isVideoOff, isSpeakerphone,
        remoteAudioMuted, remoteVideoMuted, toggleMute, toggleVideo, toggleSpeakerphone,
        switchCamera, channelId, isEngineReady
    } = useAgora({ currentUser, friend, callType, callState: callState as 'incoming' | 'outgoing' | 'active' | null, onAcceptCall, onEndCall, isGroup });

    // Call logic (timer, accept, end, log)
    const { callDuration, acceptCall, endCall, goToChat, retryCall } = useCallActions(
        callState, callType, friend, currentUser, isGroup, endReason, onAcceptCall, onEndCall, onRetry
    );

    // Memoized — only re-renders when remoteUids/callState/friend changes
    const RemoteVideoArea = useCallback(() => {
        if (remoteUids.length === 0) {
            const avatarUri = friend?.avatar_url || friend?.img
                || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(friend?.name || friend?.username || 'User')}&backgroundColor=F68537`;
            const statusText = callState === 'outgoing' ? 'Calling...'
                : callState === 'ringing' ? 'Ringing...'
                : callState === 'incoming' ? 'Incoming Call...'
                : `On Call (${remoteUids.length} joined)`;
            return (
                <View style={styles.placeholderContainer}>
                    <View style={styles.avatarContainer}>
                        <Image source={avatarUri} style={styles.fullImage} />
                    </View>
                    <Text style={styles.friendName}>{friend?.name || friend?.username || 'Friend'}</Text>
                    <Text style={styles.callStatus}>{statusText}</Text>
                </View>
            );
        }
        if (isGroup) {
            return (
                <View style={styles.groupVideoGrid}>
                    {remoteUids.map((uid) => (
                        <View key={uid} style={styles.groupVideoCell}>
                            {isEngineReady && <AgoraVideoView uid={uid} style={styles.groupVideoInner} channelId={channelId} />}
                        </View>
                    ))}
                </View>
            );
        }
        return isEngineReady
            ? <AgoraVideoView uid={remoteUids[0]} style={styles.fullSize} channelId={channelId} />
            : <View style={styles.darkFullSize} />;
    }, [remoteUids, callState, friend, isGroup, isEngineReady, channelId]);

    const toggleSwap = useCallback(() => { if (!isGroup) setIsSwapped(p => !p); }, [isGroup]);
    const toggleControls = useCallback(() => setShowControls(p => !p), []);

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={() => {
                if (callState === 'ended') onEndCall();
                else if (onMinimize) onMinimize();
                else onEndCall();
            }}
        >
            <View style={styles.container}>
                {/* Minimize Button */}
                {callState !== 'ended' && onMinimize && showControls && (
                    <TouchableOpacity style={styles.minimizeButton} onPress={onMinimize}>
                        <Ionicons name="chevron-down" size={32} color="white" />
                    </TouchableOpacity>
                )}

                {/* Main Video Area */}
                <TouchableWithoutFeedback onPress={toggleControls}>
                    <View style={styles.mainVideoContainer}>
                        {callType === 'video' ? (
                            <>
                                {isSwapped && isEngineReady
                                    ? <AgoraVideoView uid={0} style={{ width, height }} channelId={channelId} />
                                    : <RemoteVideoArea />
                                }
                                {!isGroup && remoteUids.length > 0 && (
                                    <>
                                        {remoteVideoMuted && (
                                            <View style={styles.videoOffOverlay}>
                                                <Ionicons name="videocam-off" size={64} color="white" />
                                                <Text style={styles.remoteOffText}>{friend?.name} has turned off camera</Text>
                                            </View>
                                        )}
                                        {remoteAudioMuted && (
                                            <View style={styles.remoteStatusBadge}>
                                                <Ionicons name="mic-off" size={16} color="white" />
                                                <Text style={styles.remoteStatusText}>Muted</Text>
                                            </View>
                                        )}
                                    </>
                                )}
                            </>
                        ) : (
                            <RemoteVideoArea />
                        )}
                    </View>
                </TouchableWithoutFeedback>

                {/* Ended Overlay */}
                {callState === 'ended' && (
                    <CallEndedOverlay friend={friend} endReason={endReason} onRetry={retryCall} onGoToChat={goToChat} />
                )}

                {/* PIP Local Preview */}
                {callType === 'video' && (callState === 'active' || callState === 'outgoing') && isEngineReady && (
                    <GestureDetector gesture={panGesture}>
                        <Animated.View style={[styles.pipContainer, animatedStyle]}>
                            <TouchableOpacity activeOpacity={0.8} onPress={toggleSwap} style={styles.flex1}>
                                <AgoraVideoView
                                    uid={isSwapped ? (remoteUids[0] || 0) : 0}
                                    style={styles.pipVideo}
                                    zOrderMediaOverlay={true}
                                    zOrderOnTop={true}
                                    channelId={channelId}
                                />
                                {isVideoOff && !isSwapped && (
                                    <View style={styles.videoOffOverlay}>
                                        <Ionicons name="videocam-off" size={24} color="white" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        </Animated.View>
                    </GestureDetector>
                )}

                {/* Timer */}
                {callState === 'active' && (
                    <View style={styles.timerContainer}>
                        <View style={styles.recordingDot} />
                        <Text style={styles.timerText}>{formatDuration(callDuration)}</Text>
                    </View>
                )}

                {/* Connection Status */}
                <View style={styles.statusIndicator}>
                    <Text style={styles.statusText}>{connectionStatus}</Text>
                </View>

                {/* Controls */}
                <View style={styles.controlsWrapper}>
                    {showControls && (
                        <CallControls
                            callState={callState}
                            callType={callType}
                            isMuted={isMuted}
                            isVideoOff={isVideoOff}
                            isSpeakerphone={isSpeakerphone}
                            onMute={toggleMute}
                            onVideo={toggleVideo}
                            onSpeaker={toggleSpeakerphone}
                            onSwitchCamera={switchCamera}
                            onAccept={acceptCall}
                            onEnd={endCall}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
    flex1: { flex: 1 },
    fullSize: { width: '100%', height: '100%' },
    darkFullSize: { width: '100%', height: '100%', backgroundColor: '#111827' },
    minimizeButton: {
        position: 'absolute', top: 50, left: 20, zIndex: 100,
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center',
    },
    mainVideoContainer: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'black', alignItems: 'center', justifyContent: 'center',
    },
    videoOffOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(31,41,55,0.8)',
    },
    remoteOffText: { color: 'white', marginTop: 12 },
    remoteStatusBadge: {
        position: 'absolute', top: 120, alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    remoteStatusText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    placeholderContainer: { alignItems: 'center' },
    avatarContainer: {
        width: 128, height: 128, borderRadius: 64, borderWidth: 4,
        borderColor: '#F68537', overflow: 'hidden', marginBottom: 16,
        backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center',
    },
    fullImage: { width: '100%', height: '100%' },
    friendName: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 8 },
    callStatus: { color: '#F68537', fontSize: 16, fontWeight: '600' },
    groupVideoGrid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%', height: '100%', padding: 2 },
    groupVideoCell: { width: '50%', height: '50%', padding: 2 },
    groupVideoInner: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: '#1F2937' },
    pipContainer: {
        position: 'absolute', top: 60, right: 20, width: 100, height: 150,
        borderRadius: 16, overflow: 'hidden', borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)', zIndex: 80, elevation: 15, backgroundColor: '#1F2937',
    },
    pipVideo: { width: '100%', height: '100%' },
    timerContainer: {
        position: 'absolute', top: 60, left: 24,
        backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 20, flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    recordingDot: { width: 8, height: 8, backgroundColor: '#EF4444', borderRadius: 4, marginRight: 8 },
    timerText: { color: 'white', fontSize: 14, fontWeight: '600' },
    statusIndicator: { position: 'absolute', top: 60, right: 24 },
    statusText: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
    controlsWrapper: { position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
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
});

