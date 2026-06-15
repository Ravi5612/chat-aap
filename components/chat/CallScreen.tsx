import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, Modal, StyleSheet, AppState } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import AgoraVideoView from './AgoraVideoView';
import FloatingCallWidget from './FloatingCallWidget';
import { useAgora } from '@/hooks/useAgora';
import { useWindowDimensions } from 'react-native';
import { useCallActions } from '@/hooks/useCallActions';
import { CallEndedOverlay } from './CallScreenComponents';
import ExpoPip from 'expo-pip';
import { sendSignalReliably } from '@/services/calls/callSignalingService';
import { useCallStore } from '@/store/useCallStore';

// Extracted Components
import { CallControls } from '@/components/chat/CallControls';
import { CallTimer } from '@/components/chat/CallTimer';
import { CallTopAvatarOverlay } from '@/components/chat/CallTopAvatarOverlay';
import { useCallDragGesture } from '@/hooks/calls/useCallDragGesture';

interface CallScreenProps {
    visible: boolean;
    callState: 'incoming' | 'outgoing' | 'ringing' | 'active' | 'ended';
    onEndCall: () => void;
    onAcceptCall: () => void;
    onRetry?: () => void;
    onMinimize?: () => void;
    onMaximize?: () => void;
    currentUser: any;
    callType: 'audio' | 'video';
    friend: any;
    offer?: any;
    isGroup?: boolean;
    endReason?: string;
}

export default function CallScreen({
    visible, callState, onEndCall, onAcceptCall, onRetry, onMinimize, onMaximize,
    currentUser, callType, friend, offer: incomingOffer, isGroup = false, endReason
}: CallScreenProps) {
    const { width, height } = useWindowDimensions();
    const [isSwapped, setIsSwapped] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const { isInPipMode } = ExpoPip.useIsInPip();

    const toggleSwap = useCallback(() => { if (!isGroup) setIsSwapped(p => !p); }, [isGroup]);
    const toggleControls = useCallback(() => setShowControls(p => !p), []);

    const requestVideoUpgrade = useCallback(() => {
        if (isGroup) {
            // Group call: directly turn on video
            useCallStore.getState().setCallType('video');
        } else {
            // 1-on-1: send signal
            sendSignalReliably(friend?.id, { type: 'request_video', caller_id: currentUser?.id, receiver_id: friend?.id });
        }
    }, [isGroup, friend?.id, currentUser?.id]);

    const { composedGesture, animatedStyle } = useCallDragGesture(toggleSwap);

    // Agora RTC
    const { joined, remoteUids, connectionStatus, isMuted, isVideoOff, isSpeakerphone,
        remoteAudioMuted, remoteVideoMuted, toggleMute, toggleVideo, toggleSpeakerphone,
        setAudioRouteAction, audioRoute,
        isScreenSharing, toggleScreenShare,
        switchCamera, channelId, isEngineReady
    } = useAgora({ currentUser, friend, callType, callState: callState as 'incoming' | 'outgoing' | 'active' | null, onAcceptCall, onEndCall, isGroup });

    // Call logic (timer, accept, end, log)
    const { callDuration, acceptCall, endCall, goToChat, retryCall } = useCallActions(
        callState, callType, friend, currentUser, isGroup, endReason, onAcceptCall, onEndCall, onRetry
    );

    React.useEffect(() => {
        const session = useCallStore.getState().callSession;
        if (session?.autoMinimize && !useCallStore.getState().isMinimized && callState !== 'ended') {
            const timer = setTimeout(() => {
                onMinimize?.();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [callState, onMinimize]);

    // Memoized — only re-renders when remoteUids/callState/friend changes
    const RemoteVideoArea = useCallback(() => {
        if (remoteUids.length === 0) {
            if (callType === 'video' && (callState === 'outgoing' || callState === 'ringing')) {
                // Return local video full screen for video call outgoing
                return isEngineReady ? <AgoraVideoView uid={0} style={styles.fullSize} channelId={channelId} /> : <View style={styles.darkFullSize} />;
            }
            
            let finalAvatarSource: any;
            if (friend?.avatar_url) {
                finalAvatarSource = { uri: friend.avatar_url };
            } else if (friend?.img) {
                if (typeof friend.img === 'string' && friend.img.startsWith('http')) {
                    finalAvatarSource = { uri: friend.img };
                } else {
                    finalAvatarSource = friend.img;
                }
            } else {
                finalAvatarSource = require('@/assets/images/default-avatar-male.jpg');
            }

            const statusText = callState === 'outgoing' ? 'Calling...'
                : callState === 'ringing' ? 'Ringing...'
                : callState === 'incoming' ? 'Incoming Call...'
                : `On Call (${remoteUids.length} joined)`;
            return (
                <View style={styles.placeholderContainer}>
                    <View style={styles.avatarContainer}>
                        <Image source={finalAvatarSource} style={styles.fullImage} contentFit="cover"  cachePolicy="memory-disk" />
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
    }, [remoteUids, callState, friend, isGroup, isEngineReady, channelId, callType]);

    // Listen to AppState to trigger PiP automatically on background
    React.useEffect(() => {
        const sub = AppState.addEventListener('change', (nextState) => {
            if (nextState === 'background' || nextState === 'inactive') {
                if (callState === 'active' && callType === 'video' && ExpoPip.isAvailable()) {
                    // Try to enter PiP
                    try {
                        ExpoPip.enterPipMode({ width: 300, height: 400 });
                    } catch (e) {
                        console.warn('Failed to enter PiP:', e);
                    }
                }
            }
        });
        return () => sub.remove();
    }, [callState, callType]);

    if (!visible) {
        if (callType === 'video' && callState === 'active' && isEngineReady) {
            return (
                <FloatingCallWidget 
                    uid={remoteUids[0] || 0}
                    channelId={channelId}
                    onMaximize={() => { if (onMaximize) onMaximize(); }}
                    onEndCall={onEndCall}
                />
            );
        }
        return null;
    }

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
            <GestureHandlerRootView style={styles.container}>
                {/* Minimize Button */}
                {!isInPipMode && callState !== 'ended' && onMinimize && showControls && (
                    <TouchableOpacity style={styles.minimizeButton} onPress={onMinimize}>
                        <Ionicons name="chevron-down" size={32} color="white" />
                    </TouchableOpacity>
                )}

                {/* Main Video Area */}
                <TouchableWithoutFeedback onPress={toggleControls}>
                    <View style={styles.mainVideoContainer}>
                        {callType === 'video' ? (
                            <>
                                {isSwapped && isEngineReady && remoteUids.length > 0
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
                {!isInPipMode && callState === 'ended' && (
                    <CallEndedOverlay friend={friend} endReason={endReason} onRetry={retryCall} onGoToChat={goToChat} />
                )}

                {/* Top Avatar Overlay for Outgoing Video Call */}
                {!isInPipMode && callType === 'video' && remoteUids.length === 0 && (callState === 'outgoing' || callState === 'ringing') && showControls && (
                    <CallTopAvatarOverlay friend={friend} callState={callState} />
                )}

                {/* PIP Local Preview (Hide if OS PiP is active) */}
                {!isInPipMode && callType === 'video' && callState === 'active' && remoteUids.length > 0 && isEngineReady && (
                    <GestureDetector gesture={composedGesture}>
                        <Animated.View style={[styles.pipContainer, animatedStyle]}>
                            <View style={styles.flex1}>
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
                            </View>
                        </Animated.View>
                    </GestureDetector>
                )}

                {/* Timer */}
                {!isInPipMode && callState === 'active' && (
                    <CallTimer duration={callDuration} />
                )}

                {/* Connection Status */}
                {!isInPipMode && (
                    <View style={styles.statusIndicator}>
                        <Text style={styles.statusText}>{connectionStatus}</Text>
                    </View>
                )}

                {/* Floating Flip Camera Button */}
                {!isInPipMode && callType === 'video' && showControls && isEngineReady && (
                    <TouchableOpacity style={styles.flipCameraButton} onPress={switchCamera}>
                        <Ionicons name="camera-reverse" size={24} color="#F68537" />
                    </TouchableOpacity>
                )}

                {/* Controls */}
                {!isInPipMode && (
                    <View style={styles.controlsWrapper}>
                        {showControls && (
                        <CallControls
                            callState={callState}
                            callType={callType}
                            isMuted={isMuted}
                            isVideoOff={isVideoOff}
                            isSpeakerphone={isSpeakerphone}
                            audioRoute={audioRoute}
                            isScreenSharing={isScreenSharing}
                            onMute={toggleMute}
                            onVideo={toggleVideo}
                            onSpeaker={toggleSpeakerphone}
                            onSetAudioRoute={setAudioRouteAction}
                            onScreenShare={toggleScreenShare}
                            onAccept={acceptCall}
                            onEnd={endCall}
                            onRequestVideoUpgrade={requestVideoUpgrade}
                        />
                        )}
                    </View>
                )}
            </GestureHandlerRootView>
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
    statusIndicator: { position: 'absolute', top: 100, right: 20 },
    statusText: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
    flipCameraButton: {
        position: 'absolute', top: 50, right: 20, zIndex: 100,
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    controlsWrapper: { position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
});
