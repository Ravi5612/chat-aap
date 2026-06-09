import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import AgoraVideoView from '@/components/chat/AgoraVideoView';

const getAvatarUri = (friend: any) => {
    if (friend?.avatar_url) return { uri: friend.avatar_url };
    if (friend?.img) {
        if (typeof friend.img === 'string' && friend.img.startsWith('http')) return { uri: friend.img };
        return friend.img;
    }
    return require('@/assets/images/default-avatar-male.jpg');
};

// Placeholder shown when no remote video stream yet
export const CallPlaceholder = memo(({ friend, callState, remoteUids }: { friend: any; callState: string; remoteUids: number[] }) => {
    const statusText =
        callState === 'outgoing' ? 'Calling...' :
        callState === 'ringing' ? 'Ringing...' :
        callState === 'incoming' ? 'Incoming Call...' :
        `On Call (${remoteUids.length} joined)`;

    return (
        <View style={styles.placeholderContainer}>
            <View style={styles.avatarContainer}>
                <Image source={getAvatarUri(friend)} style={styles.fullImage} />
            </View>
            <Text style={styles.friendName}>{friend?.name || friend?.username || 'Friend'}</Text>
            <Text style={styles.callStatus}>{statusText}</Text>
        </View>
    );
});

export const CallEndedOverlay = memo(({ friend, endReason, onRetry, onGoToChat }: {
    friend: any; endReason?: string; onRetry: () => void; onGoToChat: () => void;
}) => {
    return (
        <View style={[StyleSheet.absoluteFillObject, styles.endedOverlay]}>
            <View style={styles.placeholderContainer}>
                <View style={styles.avatarContainerEnded}>
                    <Image source={getAvatarUri(friend)} style={styles.fullImage} />
                </View>
                <Text style={styles.friendName}>{friend?.name || friend?.username || 'Friend'}</Text>
                <Text style={styles.endedStatus}>
                    {endReason || 'Call Ended'}
                </Text>
            </View>

            <View style={styles.endedActions}>
                <TouchableOpacity style={styles.actionItem} onPress={onRetry}>
                    <View style={styles.actionBtnLarge}>
                        <Ionicons name="call" size={32} color="white" />
                    </View>
                    <Text style={styles.actionLabel}>Call Again</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionItem} onPress={onGoToChat}>
                    <View style={styles.actionBtnLarge}>
                        <Ionicons name="chatbubble" size={32} color="white" />
                    </View>
                    <Text style={styles.actionLabel}>Message</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

// Remote video area (group grid or single)
export const RemoteVideoArea = memo(({ remoteUids, friend, callState, isGroup, isEngineReady, channelId }: {
    remoteUids: number[]; friend: any; callState: string; isGroup: boolean;
    isEngineReady: boolean; channelId: string;
}) => {
    if (remoteUids.length === 0) {
        return <CallPlaceholder friend={friend} callState={callState} remoteUids={remoteUids} />;
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
    return isEngineReady
        ? <AgoraVideoView uid={remoteUid} style={styles.fullVideo} channelId={channelId} />
        : <View style={styles.darkFullVideo} />;
});

// Bottom controls bar
export const CallControls = memo(({ callState, callType, isMuted, isVideoOff, isSpeakerphone, onMute, onVideo, onSpeaker, onSwitchCamera, onAccept, onEnd }: {
    callState: string; callType: string;
    isMuted: boolean; isVideoOff: boolean; isSpeakerphone: boolean;
    onMute: () => void; onVideo: () => void; onSpeaker: () => void;
    onSwitchCamera: () => void; onAccept: () => void; onEnd: () => void;
}) => {
    return (
        <View style={styles.controlsWrapper}>
            <View style={styles.controlsContainer}>
                <TouchableOpacity onPress={onMute} style={[styles.controlButton, isMuted && styles.dangerButton]}>
                    <Ionicons name={isMuted ? "mic-off" : "mic"} size={22} color="white" />
                </TouchableOpacity>

                {callState === 'incoming' && (
                    <TouchableOpacity onPress={onAccept} style={[styles.controlButton, styles.successButton, styles.largeButton]}>
                        <Ionicons name="call" size={28} color="white" />
                    </TouchableOpacity>
                )}

                {callType === 'audio' && (
                    <TouchableOpacity onPress={onSpeaker} style={[styles.controlButton, !isSpeakerphone && styles.dimButton]}>
                        <Ionicons name={isSpeakerphone ? "volume-high" : "volume-medium"} size={22} color="white" />
                    </TouchableOpacity>
                )}

                <TouchableOpacity onPress={onEnd} style={[styles.controlButton, styles.dangerButton, styles.largeButton]}>
                    <Ionicons name="close" size={28} color="white" />
                </TouchableOpacity>

                {callType === 'video' && (
                    <TouchableOpacity onPress={onVideo} style={[styles.controlButton, isVideoOff && styles.dangerButton]}>
                        <Ionicons name={isVideoOff ? "videocam-off" : "videocam"} size={22} color="white" />
                    </TouchableOpacity>
                )}

                {callType === 'video' && (
                    <TouchableOpacity onPress={onSwitchCamera} style={styles.controlButton}>
                        <Ionicons name="refresh" size={22} color="white" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
});


const styles = StyleSheet.create({
    placeholderContainer: { alignItems: 'center' },
    avatarContainer: {
        width: 128, height: 128, borderRadius: 64, borderWidth: 4,
        borderColor: '#F68537', overflow: 'hidden', marginBottom: 16,
        backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center',
    },
    avatarContainerEnded: {
        width: 128, height: 128, borderRadius: 64, borderWidth: 4,
        borderColor: '#EF4444', overflow: 'hidden', marginBottom: 16,
        backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center',
    },
    fullImage: { width: '100%', height: '100%' },
    friendName: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 8 },
    callStatus: { color: '#F68537', fontSize: 16, fontWeight: '600' },
    endedStatus: { color: '#EF4444', fontSize: 16, fontWeight: '600', marginTop: 12 },
    endedOverlay: { backgroundColor: '#111827', zIndex: 1000, justifyContent: 'center', alignItems: 'center' },
    endedActions: { flexDirection: 'row', gap: 40, position: 'absolute', bottom: 80, width: '100%', justifyContent: 'center' },
    actionItem: { alignItems: 'center' },
    actionBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#4B5563', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    actionBtnLarge: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F68537', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    actionLabel: { color: 'white', fontSize: 13 },
    fullVideo: { width: '100%', height: '100%' },
    darkFullVideo: { width: '100%', height: '100%', backgroundColor: '#111827' },
    groupVideoGrid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%', height: '100%', padding: 2 },
    gridVideoItem: { width: '50%', height: '50%', padding: 2 },
    gridVideo: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: '#1F2937' },
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
    dimButton: { backgroundColor: '#4B5563' },
    successButton: { backgroundColor: '#10B981' },
});

