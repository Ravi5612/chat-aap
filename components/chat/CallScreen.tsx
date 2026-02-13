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
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View className="flex-1 bg-gray-900">
                {/* Main Video (Remote) */}
                <View className="absolute inset-0 bg-black flex items-center justify-center">
                    {callType === 'video' && remoteStream && !isSwapped ? (
                        <RTCView
                            streamURL={(remoteStream as any).toURL()}
                            style={styles.fullVideo}
                            objectFit="cover"
                        />
                    ) : (
                        <View className="items-center">
                            <View className="w-32 h-32 rounded-full border-4 border-[#F68537] overflow-hidden mb-4 bg-gray-800 flex items-center justify-center">
                                {friend.avatar_url ? (
                                    <Image source={{ uri: friend.avatar_url }} className="w-full h-full" />
                                ) : (
                                    <Ionicons name="person" size={64} color="#94A3B8" />
                                )}
                            </View>
                            <Text className="text-2xl font-bold text-white mb-2">{friend.name || friend.username || 'Friend'}</Text>
                            <Text className="text-[#F68537] animate-pulse font-medium">
                                {callState === 'outgoing' ? 'Calling...' :
                                    callState === 'incoming' ? 'Incoming Call...' :
                                        callType === 'audio' ? 'On Call' : 'Connecting video...'}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Local Preview (PIP) */}
                {callType === 'video' && localStream && (
                    <TouchableOpacity
                        onPress={() => setIsSwapped(!isSwapped)}
                        style={styles.pipContainer}
                        className="bg-gray-800 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl"
                    >
                        <RTCView
                            streamURL={(localStream as any).toURL()}
                            style={styles.pipVideo}
                            objectFit="cover"
                            mirror={true}
                        />
                        {isVideoOff && (
                            <View className="absolute inset-0 flex items-center justify-center bg-gray-800/80">
                                <Ionicons name="videocam-off" size={24} color="white" />
                            </View>
                        )}
                    </TouchableOpacity>
                )}

                {/* Top Overlay (Timer) */}
                {callState === 'active' && (
                    <View className="absolute top-12 left-6 bg-black/40 px-4 py-2 rounded-full flex-row items-center gap-2 border border-white/10">
                        <View className="w-2 h-2 bg-red-500 rounded-full" />
                        <Text className="text-white text-sm font-medium">{formatDuration(callDuration)}</Text>
                    </View>
                )}

                {/* Connection Status */}
                <View className="absolute top-12 right-6">
                    <Text className="text-white/50 text-[10px]">{connectionStatus}</Text>
                </View>

                {/* Controls */}
                <View className="absolute bottom-16 left-0 right-0 flex-row items-center justify-center gap-8">
                    <TouchableOpacity
                        onPress={toggleMute}
                        className={`p-4 rounded-full ${isMuted ? 'bg-red-500' : 'bg-white/10'}`}
                    >
                        <Ionicons name={isMuted ? "mic-off" : "mic"} size={24} color="white" />
                    </TouchableOpacity>

                    {callState === 'incoming' && (
                        <TouchableOpacity
                            onPress={acceptCall}
                            className="p-6 rounded-full bg-green-500 shadow-lg shadow-green-500/30"
                        >
                            <Ionicons name="call" size={32} color="white" />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        onPress={endCall}
                        className="p-6 rounded-full bg-red-500 shadow-lg shadow-red-500/30"
                    >
                        <Ionicons name="close" size={32} color="white" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={toggleVideo}
                        style={{ display: callType === 'video' ? 'flex' : 'none' }}
                        className={`p-4 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-white/10'}`}
                    >
                        <Ionicons name={isVideoOff ? "videocam-off" : "videocam"} size={24} color="white" />
                    </TouchableOpacity>

                    {callType === 'video' && (
                        <TouchableOpacity
                            onPress={switchCamera}
                            className="p-4 rounded-full bg-white/10"
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
        zIndex: 50,
    },
    pipVideo: {
        width: '100%',
        height: '100%',
    }
});
