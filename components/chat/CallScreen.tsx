import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useCallLogger } from '@/hooks/useCallLogger';

let RTCView: any = View; // Fallback to View if WebRTC is missing
try {
    const WebRTCModule = require('react-native-webrtc');
    if (WebRTCModule.RTCView) {
        RTCView = WebRTCModule.RTCView;
    }
} catch (e) {
    console.warn("RTCView not found. Calling UI will be limited.");
}

const { width, height } = Dimensions.get('window');

interface CallScreenProps {
    visible: boolean;
    callState: 'incoming' | 'outgoing' | 'active';
    onEndCall: () => void;
    onAcceptCall: () => void;
    currentUser: any;
    callType: 'audio' | 'video';
    friend: any;
    offer?: any;
}

export default function CallScreen({
    visible,
    callState,
    onEndCall,
    onAcceptCall,
    currentUser,
    callType,
    friend,
    offer: incomingOffer
}: CallScreenProps) {
    const [callDuration, setCallDuration] = useState(0);
    const [isSwapped, setIsSwapped] = useState(false);
    const durationRef = useRef(0);

    const {
        localStream,
        remoteStream,
        connectionStatus,
        isMuted,
        isVideoOff,
        acceptCall,
        endCall,
        toggleMute,
        toggleVideo,
        switchCamera
    } = useWebRTC({
        currentUser,
        friend,
        callType,
        callState,
        onAcceptCall,
        onEndCall,
        incomingOffer
    });

    const { saveCallLog } = useCallLogger(currentUser, friend, callType, callState);

    // Call Duration Timer
    useEffect(() => {
        let interval: any;
        if (callState === 'active') {
            interval = setInterval(() => {
                setCallDuration(prev => {
                    const next = prev + 1;
                    durationRef.current = next;
                    return next;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [callState]);

    // Logging on unmount
    useEffect(() => {
        return () => {
            if (callState === 'active' || callState === 'outgoing') {
                saveCallLog(durationRef.current > 0 ? 'completed' : 'missed', durationRef.current);
            }
        };
    }, []);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onEndCall}>
            <View style={styles.container}>
                {/* Main Video (Remote) */}
                <View style={styles.mainVideoContainer}>
                    {callType === 'video' && remoteStream && !isSwapped && RTCView !== View ? (
                        <RTCView
                            streamURL={(remoteStream as any).toURL()}
                            style={styles.fullVideo}
                            objectFit="cover"
                        />
                    ) : (
                        <View style={styles.placeholderContainer}>
                            <View style={styles.avatarContainer}>
                                {friend.avatar_url ? (
                                    <Image source={{ uri: friend.avatar_url }} style={styles.fullImage} />
                                ) : (
                                    <Ionicons name="person" size={64} color="#94A3B8" />
                                )}
                            </View>
                            <Text style={styles.friendName}>{friend.name || friend.username || 'Friend'}</Text>
                            <Text style={styles.callStatus}>
                                {callState === 'outgoing' ? 'Calling...' :
                                    callState === 'incoming' ? 'Incoming Call...' :
                                        callType === 'audio' ? 'On Call' : 'Connecting video...'}
                            </Text>
                            {RTCView === View && callType === 'video' && (
                                <Text style={styles.debugText}>(Video preview not available in Expo Go)</Text>
                            )}
                        </View>
                    )}
                </View>

                {/* Local Preview (PIP) */}
                {callType === 'video' && localStream && RTCView !== View && (
                    <TouchableOpacity
                        onPress={() => setIsSwapped(!isSwapped)}
                        style={styles.pipContainer}
                    >
                        <RTCView
                            streamURL={(localStream as any).toURL()}
                            style={styles.pipVideo}
                            objectFit="cover"
                            mirror={true}
                        />
                        {isVideoOff && (
                            <View style={styles.videoOffOverlay}>
                                <Ionicons name="videocam-off" size={24} color="white" />
                            </View>
                        )}
                    </TouchableOpacity>
                )}

                {/* Top Overlay (Timer) */}
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
                <View style={styles.controlsContainer}>
                    <TouchableOpacity
                        onPress={toggleMute}
                        style={[styles.controlButton, isMuted && styles.dangerButton]}
                    >
                        <Ionicons name={isMuted ? "mic-off" : "mic"} size={24} color="white" />
                    </TouchableOpacity>

                    {callState === 'incoming' && (
                        <TouchableOpacity
                            onPress={acceptCall}
                            style={[styles.controlButton, styles.successButton, styles.largeButton]}
                        >
                            <Ionicons name="call" size={32} color="white" />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        onPress={endCall}
                        style={[styles.controlButton, styles.dangerButton, styles.largeButton]}
                    >
                        <Ionicons name="close" size={32} color="white" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={toggleVideo}
                        style={[
                            styles.controlButton,
                            isVideoOff && styles.dangerButton,
                            { display: callType === 'video' ? 'flex' : 'none' }
                        ]}
                    >
                        <Ionicons name={isVideoOff ? "videocam-off" : "videocam"} size={24} color="white" />
                    </TouchableOpacity>

                    {callType === 'video' && (
                        <TouchableOpacity
                            onPress={switchCamera}
                            style={styles.controlButton}
                        >
                            <Ionicons name="refresh" size={24} color="white" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111827',
    },
    mainVideoContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'black',
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderContainer: {
        alignItems: 'center',
    },
    avatarContainer: {
        width: 128,
        height: 128,
        borderRadius: 64,
        borderWidth: 4,
        borderColor: '#F68537',
        overflow: 'hidden',
        marginBottom: 16,
        backgroundColor: '#1F2937',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullImage: {
        width: '100%',
        height: '100%',
    },
    friendName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 8,
    },
    callStatus: {
        color: '#F68537',
        fontSize: 16,
        fontWeight: '600',
    },
    debugText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        marginTop: 8,
    },
    fullVideo: {
        width,
        height,
    },
    pipContainer: {
        position: 'absolute',
        top: 60,
        right: 20,
        width: 100,
        height: 150,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
        zIndex: 50,
        elevation: 10,
        backgroundColor: '#1F2937',
    },
    pipVideo: {
        width: '100%',
        height: '100%',
    },
    videoOffOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(31, 41, 55, 0.8)',
    },
    timerContainer: {
        position: 'absolute',
        top: 60,
        left: 24,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    recordingDot: {
        width: 8,
        height: 8,
        backgroundColor: '#EF4444',
        borderRadius: 4,
        marginRight: 8,
    },
    timerText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    statusIndicator: {
        position: 'absolute',
        top: 60,
        right: 24,
    },
    statusText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
    },
    controlsContainer: {
        position: 'absolute',
        bottom: 60,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
    },
    controlButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    largeButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
    },
    dangerButton: {
        backgroundColor: '#EF4444',
    },
    successButton: {
        backgroundColor: '#10B981',
    },
});
