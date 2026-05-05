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
    const intervalRef = useRef<NodeJS.Timeout | null>(null); // NEW: Dedicated interval ref
    const lastCallInfo = useRef({
        state: callState,
        friend: friend,
        type: callType
    });
    const hasLogged = useRef(false);

    // Track props for debugging
    useEffect(() => {
        console.log(`[CALL_ACTION] Props Update - visible: ${visible}, state: ${callState}, type: ${callType}, friend: ${friend?.name}`);
    }, [visible, callState, callType, friend?.id]);

    // Draggable PIP values
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    const onGestureEvent = (event: any) => {
        translateX.value = event.nativeEvent.translationX;
        translateY.value = event.nativeEvent.translationY;
        // console.log('[CALL_ACTION] PIP Dragging:', Math.round(event.nativeEvent.translationX), Math.round(event.nativeEvent.translationY));
    };

    const onHandlerStateChange = (event: any) => {
        if (event.nativeEvent.state === State.END) {
            console.log(`[CALL_ACTION] PIP Drag Ended at X: ${Math.round(event.nativeEvent.translationX)}, Y: ${Math.round(event.nativeEvent.translationY)}`);
            translateX.value = withSpring(event.nativeEvent.translationX);
            translateY.value = withSpring(event.nativeEvent.translationY);
        }
    };

    const handleSwap = () => {
        const nextSwapped = !isSwapped;
        console.log('[CALL_ACTION] Video Swapped. Local is now:', nextSwapped ? 'Full Screen' : 'Small Box');
        setIsSwapped(nextSwapped);
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
        ],
    }));

    // Keep memory of the call info even if props become null
    if (callState && friend?.id) {
        lastCallInfo.current = {
            state: callState,
            friend: friend,
            type: callType
        };
    }

    const {
        joined,
        remoteUid,
        connectionStatus,
        isMuted,
        isVideoOff,
        toggleMute,
        toggleVideo,
        switchCamera,
        channelName
    } = useAgora({
        currentUser,
        friend,
        callType,
        callState,
        onAcceptCall,
        onEndCall
    });

    const { saveCallLog } = useCallLogger(currentUser, friend, callType, callState);

    const acceptCall = () => {
        console.log('[CALL_ACTION] Accept button pressed');
        // Signaling: Tell the caller we accepted
        const signalChannelName = `calls-signal-${friend.id}`;
        console.log('[CALL_ACTION] Sending accepted signal to caller channel:', signalChannelName);
        const personalChannel = supabase.channel(signalChannelName);
        personalChannel.subscribe((status) => {
            console.log('[CALL_ACTION] Acceptance channel status:', status);
            if (status === 'SUBSCRIBED') {
                personalChannel.send({
                    type: 'broadcast',
                    event: 'signal',
                    payload: { type: 'accepted', caller_id: currentUser.id }
                });
                console.log('[CALL_ACTION] "accepted" signal broadcasted');
                setTimeout(() => {
                    console.log('[CALL_ACTION] Cleaning up signaling channel');
                    supabase.removeChannel(personalChannel);
                }, 2000);
            }
        });
        onAcceptCall();
    };

    const endCall = () => {
        console.log('[CALL_ACTION] End call button pressed (Manual)');
        onEndCall();
    };

    // Call Duration Timer - STABILIZED
    useEffect(() => {
        const isCallActive = (callState === 'active');
        
        if (isCallActive) {
            // ONLY start if there is no existing interval
            if (!intervalRef.current) {
                console.log('[CALL_ACTION] Starting Single Stable Timer');
                intervalRef.current = setInterval(() => {
                    setCallDuration(prev => {
                        const next = prev + 1;
                        durationRef.current = next;
                        if (next % 5 === 0) {
                            console.log(`[CALL_ACTION] Timer Tick: ${next}s`);
                        }
                        return next;
                    });
                }, 1000);
            }
        } else {
            // Stop and clear if not active
            if (intervalRef.current) {
                console.log('[CALL_ACTION] Stopping and clearing Timer');
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        // Cleanup on unmount or state change
        return () => {
            if (intervalRef.current && callState !== 'active') {
                console.log('[CALL_ACTION] Cleanup: Clearing Timer Interval');
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [callState]);

    // Detect call end by visibility change
    useEffect(() => {
        if (!visible && lastCallInfo.current.state) {
            // Screen just closed
            const finalState = lastCallInfo.current.state;
            const finalDuration = durationRef.current;
            const finalFriend = lastCallInfo.current.friend;

            if (finalFriend?.id) {
                const logStatus = finalDuration > 0 ? 'completed' : 
                                (finalState === 'incoming' ? 'missed' : 'cancelled');
                
                console.log(`[CALL_ACTION] Triggering saveCallLog. Status: ${logStatus}, Duration: ${finalDuration}`);
                saveCallLog(logStatus, finalDuration, finalFriend);
            }
            
            // Reset local memory for next call
            lastCallInfo.current = { state: null as any, friend: null, type: null as any };
            durationRef.current = 0;
            setCallDuration(0);
        }
    }, [visible]); // ONLY trigger on visibility change

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onEndCall}>
            <View style={styles.container}>
                {/* Main Video Container */}
                <View style={styles.mainVideoContainer}>
                    {callType === 'video' ? (
                        <>
                            {isSwapped ? (
                                /* Local video in full screen */
                                <AgoraVideoView
                                    uid={0}
                                    style={styles.fullVideo}
                                />
                            ) : remoteUid !== 0 ? (
                                /* Remote video in full screen */
                                <AgoraVideoView
                                    uid={remoteUid}
                                    style={styles.fullVideo}
                                />
                            ) : (
                                /* Waiting for remote user */
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
                                                'Connecting video...'}
                                    </Text>
                                </View>
                            )}

                            {/* Video Off Overlay for Main Screen (if local is full and off) */}
                            {isSwapped && isVideoOff && (
                                <View style={styles.videoOffOverlay}>
                                    <Ionicons name="videocam-off" size={64} color="white" />
                                    <Text className="text-white mt-4">Your camera is off</Text>
                                </View>
                            )}
                        </>
                    ) : (
                        /* Audio Call Placeholder */
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
                                        'On Call'}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Local Preview (PIP) - Draggable & Swappable */}
                {callType === 'video' && (callState === 'active' || callState === 'outgoing') && (
                    <PanGestureHandler
                        onGestureEvent={onGestureEvent}
                        onHandlerStateChange={onHandlerStateChange}
                    >
                        <Animated.View style={[styles.pipContainer, animatedStyle]}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={handleSwap}
                                style={{ flex: 1 }}
                            >
                                <AgoraVideoView
                                    uid={isSwapped ? remoteUid : 0}
                                    style={styles.pipVideo}
                                    zOrderMediaOverlay={true}
                                    zOrderOnTop={true}
                                />
                                {!isSwapped && isVideoOff && (
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
                <View style={styles.controlsContainer}>
                    <TouchableOpacity
                        onPress={() => {
                            console.log('[CALL_ACTION] Mute toggled');
                            toggleMute();
                        }}
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
                        onPress={() => {
                            console.log('[CALL_ACTION] Video toggled');
                            toggleVideo();
                        }}
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
                            onPress={() => {
                                console.log('[CALL_ACTION] Camera switched');
                                switchCamera();
                            }}
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
