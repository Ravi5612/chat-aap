import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import AgoraVideoView from './AgoraVideoView';
import { useAgora } from '@/hooks/useAgora';
import { useWindowDimensions } from 'react-native';

// Hooks
import { useCallActions } from '@/hooks/useCallActions';

// Sub-components
import { CallEndedOverlay, RemoteVideoArea, CallControls } from './CallScreenComponents';

const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

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

    // Draggable PIP
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    }));
    const onGestureEvent = (event: any) => {
        translateX.value = event.nativeEvent.translationX;
        translateY.value = event.nativeEvent.translationY;
    };
    const onHandlerStateChange = (event: any) => {
        if (event.nativeEvent.state === State.END) {
            translateX.value = withSpring(event.nativeEvent.translationX);
            translateY.value = withSpring(event.nativeEvent.translationY);
        }
    };

    // Agora RTC
    const { joined, remoteUids, connectionStatus, isMuted, isVideoOff, isSpeakerphone,
        remoteAudioMuted, remoteVideoMuted, toggleMute, toggleVideo, toggleSpeakerphone,
        switchCamera, channelId, isEngineReady
    } = useAgora({ currentUser, friend, callType, callState: callState as 'incoming' | 'outgoing' | 'active' | null, onAcceptCall, onEndCall, isGroup });

    // Call logic (timer, accept, end, log)
    const { callDuration, acceptCall, endCall, goToChat, retryCall } = useCallActions(
        callState, callType, friend, currentUser, isGroup, endReason, onAcceptCall, onEndCall, onRetry
    );

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
                {callState !== 'ended' && onMinimize && (
                    <TouchableOpacity style={styles.minimizeButton} onPress={onMinimize}>
                        <Ionicons name="chevron-down" size={32} color="white" />
                    </TouchableOpacity>
                )}

                {/* Main Video Area */}
                <View style={styles.mainVideoContainer}>
                    {callType === 'video' ? (
                        <>
                            {isSwapped && isEngineReady
                                ? <AgoraVideoView uid={0} style={{ width, height }} channelId={channelId} />
                                : <RemoteVideoArea remoteUids={remoteUids} friend={friend} callState={callState}
                                    isGroup={isGroup} isEngineReady={isEngineReady} channelId={channelId} />
                            }
                            {!isGroup && remoteUids.length > 0 && (
                                <>
                                    {remoteVideoMuted && (
                                        <View style={styles.videoOffOverlay}>
                                            <Ionicons name="videocam-off" size={64} color="white" />
                                            <Text style={{ color: 'white', marginTop: 12 }}>{friend?.name} has turned off camera</Text>
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
                        <RemoteVideoArea remoteUids={remoteUids} friend={friend} callState={callState}
                            isGroup={isGroup} isEngineReady={isEngineReady} channelId={channelId} />
                    )}
                </View>

                {/* Ended Overlay */}
                {callState === 'ended' && (
                    <CallEndedOverlay friend={friend} endReason={endReason} onRetry={retryCall} onGoToChat={goToChat} />
                )}

                {/* PIP Local Preview */}
                {callType === 'video' && (callState === 'active' || callState === 'outgoing') && isEngineReady && (
                    <PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange}>
                        <Animated.View style={[styles.pipContainer, animatedStyle]}>
                            <TouchableOpacity activeOpacity={0.8} onPress={() => !isGroup && setIsSwapped(p => !p)} style={{ flex: 1 }}>
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
                    </PanGestureHandler>
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
            </View>
        </Modal>
    );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
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
    remoteStatusBadge: {
        position: 'absolute', top: 120, alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    remoteStatusText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    pipContainer: {
        position: 'absolute', top: 60, right: 20, width: 100, height: 150,
        borderRadius: 16, overflow: 'hidden', borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)', zIndex: 50, elevation: 10, backgroundColor: '#1F2937',
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
});
