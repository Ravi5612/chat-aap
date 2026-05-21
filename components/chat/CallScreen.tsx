import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDecay } from 'react-native-reanimated';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import AgoraVideoView from './AgoraVideoView';
import { useAgora } from '@/hooks/useAgora';
import { useCallLogger } from '@/hooks/useCallLogger';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useWindowDimensions } from 'react-native';

interface CallScreenProps {
    visible: boolean;
    callState: 'incoming' | 'outgoing' | 'ringing' | 'active' | 'ended';
    onEndCall: () => void;
    onAcceptCall: () => void;
    onRetry?: () => void; // New: retry call
    onMinimize?: () => void; // New: minimize call
    currentUser: any;
    callType: 'audio' | 'video';
    friend: any;
    offer?: any;
    isGroup?: boolean;
    endReason?: string;
}

export default function CallScreen({
    visible,
    callState,
    onEndCall,
    onAcceptCall,
    onRetry,
    onMinimize,
    currentUser,
    callType,
    friend,
    offer: incomingOffer,
    isGroup = false,
    endReason
}: CallScreenProps) {
    const router = useRouter();
    const { width, height } = useWindowDimensions();
    const [callDuration, setCallDuration] = useState(0);
    const [isSwapped, setIsSwapped] = useState(false);
    const startTimeRef = useRef<number | null>(null); // NEW: To track when the call actually started
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastCallInfo = useRef({
        state: callState,
        friend: friend,
        type: callType,
        isGroup: isGroup
    });
    const hasLogged = useRef(false);

    // Track props for debugging
    useEffect(() => {
        console.log(`[CALL_ACTION] Props Update - visible: ${visible}, state: ${callState}, type: ${callType}, friend: ${friend?.name}, isGroup: ${isGroup}`);
    }, [visible, callState, callType, friend?.id, isGroup]);

    // Draggable PIP values
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

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

    const handleSwap = () => {
        if (isGroup) return; // Swapping is for 1-on-1 calls
        const nextSwapped = !isSwapped;
        setIsSwapped(nextSwapped);
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
        ],
    }));

    // Keep memory of the call info even if props become null
    useEffect(() => {
        if (callState && friend?.id) {
            lastCallInfo.current = {
                state: callState,
                friend: friend,
                type: callType,
                isGroup: isGroup
            };
        }
    }, [callState, friend?.id, callType, isGroup]);

    const {
        joined,
        remoteUids,
        connectionStatus,
        isMuted,
        isVideoOff,
        remoteAudioMuted,
        remoteVideoMuted,
        toggleMute,
        toggleVideo,
        switchCamera,
        channelId,
        isEngineReady
    } = useAgora({
        currentUser,
        friend,
        callType,
        callState,
        onAcceptCall,
        onEndCall,
        isGroup
    });

    const { saveCallLog } = useCallLogger(currentUser, friend, callType, callState);

    const acceptCall = () => {
        console.log('[CALL_ACTION] Accept button pressed');
        // Signaling: Tell the caller (or group) we accepted
        const targetId = friend.id;
        const signalChannelName = `calls-signal-${targetId}`;
        const personalChannel = supabase.channel(signalChannelName);
        
        personalChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                personalChannel.send({
                    type: 'broadcast',
                    event: 'signal',
                    payload: { 
                        type: 'accepted', 
                        caller_id: currentUser.id,
                        is_group: isGroup,
                        group_id: isGroup ? friend.id : null
                    }
                });
                // Clean up channel after a short delay
                setTimeout(() => {
                    supabase.removeChannel(personalChannel).catch(() => {});
                }, 1000);
            }
        });
        // We do NOT call onAcceptCall() here because the payload 'accepted' 
        // will be caught by useCallManager which then calls setCallActive() globally.
    };

    const endCall = () => {
        onEndCall();
    };

    // ... (Duration timer logic remains same)

    const renderRemoteVideos = () => {
        if (remoteUids.length === 0) {
            return (
                <View style={styles.placeholderContainer}>
                    <View style={styles.avatarContainer}>
                        {friend.avatar_url || friend.img ? (
                            <Image source={{ uri: friend.avatar_url || friend.img }} style={styles.fullImage} />
                        ) : (
                            <Ionicons name="person" size={64} color="#94A3B8" />
                        )}
                    </View>
                    <Text style={styles.friendName}>{friend.name || friend.username || 'Friend'}</Text>
                    <Text style={styles.callStatus}>
                        {callState === 'outgoing' ? 'Calling...' :
                            callState === 'ringing' ? 'Ringing...' :
                            callState === 'incoming' ? 'Incoming Call...' :
                                'Waiting for participants...'}
                    </Text>
                </View>
            );
        }

        if (isGroup) {
            return (
                <View style={styles.groupVideoGrid}>
                    {remoteUids.map((uid) => (
                        <View key={uid} style={styles.gridVideoItem}>
                            {isEngineReady && (
                                <AgoraVideoView uid={uid} style={styles.gridVideo} channelId={channelId} />
                            )}
                        </View>
                    ))}
                </View>
            );
        }

        const remoteUid = remoteUids[0];
        return isEngineReady ? (
            <AgoraVideoView
                uid={remoteUid}
                style={styles.fullVideo}
                channelId={channelId}
            />
        ) : (
            <View style={[styles.fullVideo, { backgroundColor: '#111827' }]} />
        );
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={() => {
            if (callState === 'ended') {
                onEndCall();
            } else if (onMinimize) {
                onMinimize();
            } else {
                onEndCall();
            }
        }}>
            <View style={styles.container}>
                {/* Minimize Button */}
                {callState !== 'ended' && onMinimize && (
                    <TouchableOpacity 
                        style={styles.minimizeButton} 
                        onPress={onMinimize}
                    >
                        <Ionicons name="chevron-down" size={32} color="white" />
                    </TouchableOpacity>
                )}
                {/* Main Video Container */}
                <View style={styles.mainVideoContainer}>
                    {callType === 'video' ? (
                        <>
                            {isSwapped && isEngineReady ? (
                                <AgoraVideoView uid={0} style={styles.fullVideo} channelId={channelId} />
                            ) : renderRemoteVideos()}

                            {/* Remote Status Badges (simplified for group) */}
                            {!isGroup && remoteUids.length > 0 && (
                                <>
                                    {remoteVideoMuted && (
                                        <View style={styles.videoOffOverlay}>
                                            <Ionicons name="videocam-off" size={64} color="white" />
                                            <Text style={{ color: 'white', marginTop: 12 }}>{friend.name} has turned off camera</Text>
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
                        /* Audio Call UI */
                        <View style={styles.placeholderContainer}>
                            <View style={styles.avatarContainer}>
                                {friend.avatar_url || friend.img ? (
                                    <Image source={{ uri: friend.avatar_url || friend.img }} style={styles.fullImage} />
                               ) : (
                                    <Ionicons name="person" size={64} color="#94A3B8" />
                                )}
                            </View>
                            <Text style={styles.friendName}>{friend.name || friend.username || 'Friend'}</Text>
                            <Text style={styles.callStatus}>
                                {callState === 'outgoing' ? 'Calling...' :
                                    callState === 'ringing' ? 'Ringing...' :
                                    callState === 'incoming' ? 'Incoming Call...' :
                                    callState === 'ended' ? (endReason || 'Call Ended') :
                                        `On Call (${remoteUids.length} joined)`}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Call Ended Overlay */}
                {callState === 'ended' && (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#111827', zIndex: 1000 }]}>
                        <View style={styles.placeholderContainer}>
                            <View style={[styles.avatarContainer, { borderColor: '#EF4444' }]}>
                                {friend.avatar_url || friend.img ? (
                                    <Image source={{ uri: friend.avatar_url || friend.img }} style={styles.fullImage} />
                                ) : (
                                    <Ionicons name="person" size={64} color="#94A3B8" />
                                )}
                            </View>
                            <Text style={styles.friendName}>{friend.name || friend.username || 'Friend'}</Text>
                            <Text style={[styles.callStatus, { color: '#EF4444', marginTop: 12 }]}>
                                {endReason || 'Call Ended'}
                            </Text>
                            
                            <View style={{ flexDirection: 'row', gap: 20, marginTop: 40 }}>
                                <TouchableOpacity 
                                    style={{ alignItems: 'center' }}
                                    onPress={onRetry ? onRetry : onEndCall} 
                                >
                                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#4B5563', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                                        <Ionicons name="repeat" size={28} color="white" />
                                    </View>
                                    <Text style={{ color: 'white', fontSize: 13 }}>Retry</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={{ alignItems: 'center' }}
                                    onPress={() => {
                                        onEndCall();
                                        // Slight delay to ensure call teardown completes before navigation
                                        setTimeout(() => {
                                            const nameParam = encodeURIComponent(friend.name || 'User');
                                            const groupParam = isGroup ? 'true' : 'false';
                                            router.push(`/chat/${friend.id}?name=${nameParam}&isGroup=${groupParam}`);
                                        }, 300);
                                    }}
                                >
                                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                                        <Ionicons name="chatbubble" size={24} color="white" />
                                    </View>
                                    <Text style={{ color: 'white', fontSize: 13 }}>Message</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}

                {/* Local Preview (PIP) */}
                {callType === 'video' && (callState === 'active' || callState === 'outgoing') && isEngineReady && (
                    <PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange}>
                        <Animated.View style={[styles.pipContainer, animatedStyle]}>
                            <TouchableOpacity activeOpacity={0.8} onPress={handleSwap} style={{ flex: 1 }}>
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
                <View style={styles.controlsWrapper}>
                    <View style={styles.controlsContainer}>
                        <TouchableOpacity
                            onPress={() => {
                                if (__DEV__) console.log('[CALL_ACTION] Mute toggled');
                                toggleMute();
                            }}
                            style={[styles.controlButton, isMuted && styles.dangerButton]}
                        >
                            <Ionicons name={isMuted ? "mic-off" : "mic"} size={22} color="white" />
                        </TouchableOpacity>

                        {callState === 'incoming' && (
                            <TouchableOpacity
                                onPress={acceptCall}
                                style={[styles.controlButton, styles.successButton, styles.largeButton]}
                            >
                                <Ionicons name="call" size={28} color="white" />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            onPress={endCall}
                            style={[styles.controlButton, styles.dangerButton, styles.largeButton]}
                        >
                            <Ionicons name="close" size={28} color="white" />
                        </TouchableOpacity>

                        {callType === 'video' && (
                            <TouchableOpacity
                                onPress={() => {
                                    if (__DEV__) console.log('[CALL_ACTION] Video toggled');
                                    toggleVideo();
                                }}
                                style={[
                                    styles.controlButton,
                                    isVideoOff && styles.dangerButton
                                ]}
                            >
                                <Ionicons name={isVideoOff ? "videocam-off" : "videocam"} size={22} color="white" />
                            </TouchableOpacity>
                        )}

                        {callType === 'video' && (
                            <TouchableOpacity
                                onPress={() => {
                                    if (__DEV__) console.log('[CALL_ACTION] Camera switched');
                                    switchCamera();
                                }}
                                style={styles.controlButton}
                            >
                                <Ionicons name="refresh" size={22} color="white" />
                            </TouchableOpacity>
                        )}
                    </View>
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
    minimizeButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 100,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
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
    controlsWrapper: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    controlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: '#F68537', // Orange Label
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 40, // Pill shape
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    controlButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)', // Slightly more visible on orange
        alignItems: 'center',
        justifyContent: 'center',
    },
    largeButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    dangerButton: {
        backgroundColor: '#EF4444',
    },
    successButton: {
        backgroundColor: '#10B981',
    },
    remoteStatusBadge: {
        position: 'absolute',
        top: 120,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    remoteStatusText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    groupVideoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: '100%',
        height: '100%',
        padding: 2,
    },
    gridVideoItem: {
        width: '50%',
        height: '50%',
        padding: 2,
    },
    gridVideo: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
        backgroundColor: '#1F2937',
    },
});
