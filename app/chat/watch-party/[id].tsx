import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, ActivityIndicator, Animated, FlatList, Image, Modal, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import YoutubeIframe from 'react-native-youtube-iframe';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useCallManager } from '@/hooks/useCallManager';
import { useCallStore } from '@/store/useCallStore';

const AnimatedReaction = ({ emoji, left }: { emoji: string, left: number }) => {
    const translateY = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(translateY, { toValue: -300, duration: 2500, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 2500, delay: 500, useNativeDriver: true })
        ]).start();
    }, []);

    return (
        <Animated.Text style={[styles.floatingReaction, { left: `${left}%`, transform: [{ translateY }], opacity }]}>
            {emoji}
        </Animated.Text>
    );
};

export default function WatchPartyScreen() {
    const { width, height } = useWindowDimensions();
    const { id: roomId, videoId, messageId, hostId } = useLocalSearchParams();
    const router = useRouter();
    const currentUser = useAuthStore(state => state.user);
    const { handleStartCall } = useCallManager(currentUser, [], false); // Just for starting call if needed

    const [playing, setPlaying] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [loading, setLoading] = useState(true);
    const [partyStatus, setPartyStatus] = useState('Joining Cinema...');
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [participants, setParticipants] = useState<any[]>([]);
    const [inviteModalVisible, setInviteModalVisible] = useState(false);
    const [friends, setFriends] = useState<any[]>([]);
    const [inviting, setInviting] = useState(false);
    
    const [currentHostId, setCurrentHostId] = useState(hostId);
    const [reactions, setReactions] = useState<{id: string, emoji: string, left: number}[]>([]);
    const [inviteCooldown, setInviteCooldown] = useState(false);
    
    const isHost = currentUser?.id === currentHostId;
    
    const playerRef = useRef<any>(null);
    const channelRef = useRef<any>(null);
    const isSyncingRef = useRef(false);
    const pulseAnim = useRef(new Animated.Value(0.5)).current;
    
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0.5, duration: 1500, useNativeDriver: true })
            ])
        ).start();
    }, []);

    // Minimize call if active
    useEffect(() => {
        const callSession = useCallStore.getState().callSession;
        if (callSession && !useCallStore.getState().isMinimized) {
            useCallStore.getState().setMinimized(true);
        }

        // Cleanup orientation on unmount
        return () => {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        };
    }, []);

    // Setup Supabase Realtime Channel for Sync
    useEffect(() => {
        if (!roomId || !currentUser) return;

        const channel = supabase.channel(`watch_party_${roomId}`, {
            config: { presence: { key: currentUser.id } }
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const active = Object.keys(state).map(key => ({
                    id: key,
                    ...(state[key][0] as any)
                }));
                // Sort to ensure deterministic host migration
                active.sort((a, b) => a.id.localeCompare(b.id));
                setParticipants(active);
                
                // Host Migration Check
                if (active.length > 0 && currentHostId) {
                    const hostStillHere = active.some(p => p.id === currentHostId);
                    if (!hostStillHere) {
                        setCurrentHostId(active[0].id);
                        if (currentUser.id === active[0].id) {
                            Alert.alert("Host Migrated 👑", "You are the new Host!");
                        }
                    }
                }
            })
            .on('broadcast', { event: 'kick' }, (payload) => {
                if (payload.payload.targetUserId === currentUser.id) {
                    Alert.alert("Removed", "The host has removed you from the theater.");
                    router.back();
                }
            })
            .on('broadcast', { event: 'reaction' }, (payload) => {
                const { emoji } = payload.payload;
                const id = Math.random().toString();
                const left = Math.random() * 80 + 10; // 10% to 90%
                setReactions(prev => [...prev, { id, emoji, left }]);
                setTimeout(() => {
                    setReactions(prev => prev.filter(r => r.id !== id));
                }, 3000);
            })
            .on('broadcast', { event: 'heartbeat' }, (payload) => {
                // Late joiner or drift fix
                if (payload.payload.userId === currentUser.id) return;
                const { time, isPlaying } = payload.payload;
                
                isSyncingRef.current = true;
                if (isPlaying !== playing) setPlaying(isPlaying);
                
                playerRef.current?.getCurrentTime().then((myTime: number) => {
                    if (Math.abs(myTime - time) > 2.0) {
                        playerRef.current?.seekTo(time, true);
                    }
                    setTimeout(() => { isSyncingRef.current = false; }, 1000);
                });
            })
            .on('broadcast', { event: 'player_state' }, (payload) => {
                // Ignore our own events
                if (payload.payload.userId === currentUser.id) return;

                const { isPlaying, time } = payload.payload;
                
                isSyncingRef.current = true; // Lock outgoing syncs
                
                if (isPlaying !== playing) {
                    setPlaying(isPlaying);
                }

                // If time difference is > 1.5 seconds, sync it
                playerRef.current?.getCurrentTime().then((myTime: number) => {
                    if (Math.abs(myTime - time) > 1.5) {
                        playerRef.current?.seekTo(time, true);
                    }
                    setTimeout(() => { isSyncingRef.current = false; }, 1000); // Release lock after sync
                });
            })
            .on('broadcast', { event: 'access_request' }, (payload) => {
                if (currentUser.id === hostId) {
                    const { requesterId, requesterName, targetFriendId, targetFriendName } = payload.payload;
                    Alert.alert(
                        "Guest Invite Request",
                        `${requesterName} wants to invite ${targetFriendName} to the theater. Allow?`,
                        [
                            { text: "Deny", style: "cancel" },
                            { text: "Allow", onPress: () => {
                                channel.send({
                                    type: 'broadcast',
                                    event: 'access_granted',
                                    payload: { requesterId, targetFriendId }
                                });
                            }}
                        ]
                    );
                }
            })
            .on('broadcast', { event: 'access_granted' }, async (payload) => {
                if (currentUser.id === payload.payload.requesterId) {
                    const { targetFriendId } = payload.payload;
                    
                    const ids = [currentUser.id, targetFriendId].sort();
                    const friendChatId = `${ids[0]}_${ids[1]}`;
                    
                    const time = await playerRef.current?.getCurrentTime() || 0;

                    const initialState = {
                        partyId: roomId,
                        videoId,
                        hostId: hostId,
                        invite_status: 'pending',
                        createdAt: new Date().toISOString(),
                        status: 'playing', // Always send as playing to be safe, sync handles the rest
                        currentTime: time
                    };

                    const { error } = await supabase.from('messages').insert({
                        chat_id: friendChatId,
                        sender_id: currentUser.id,
                        message: JSON.stringify(initialState),
                        message_type: 'watch_party'
                    });

                    if (!error) {
                        Alert.alert("Invite Approved! 🍿", "Your ticket was sent successfully.");
                    } else {
                        Alert.alert("Error", "Could not send invite.");
                    }
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ name: currentUser.name, avatar: currentUser.image });
                    setPartyStatus('Connected to Cinema 🍿');
                    setTimeout(() => setPartyStatus(''), 3000);
                }
            });

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, currentUser, currentHostId]);

    // Heartbeat Sync
    useEffect(() => {
        if (!isHost || !playing || !channelRef.current) return;
        const interval = setInterval(() => {
            playerRef.current?.getCurrentTime().then((time: number) => {
                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'heartbeat',
                    payload: { userId: currentUser?.id, time, isPlaying: true }
                });
            });
        }, 3000);
        return () => clearInterval(interval);
    }, [isHost, playing, currentUser]);

    const sendReaction = (emoji: string) => {
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'reaction',
                payload: { emoji }
            });
            // Show locally instantly
            const id = Math.random().toString();
            const left = Math.random() * 80 + 10;
            setReactions(prev => [...prev, { id, emoji, left }]);
            setTimeout(() => {
                setReactions(prev => prev.filter(r => r.id !== id));
            }, 3000);
        }
    };

    const broadcastState = useCallback((isPlaying: boolean, time: number) => {
        if (isSyncingRef.current) return; // Prevent echo loops
        
        if (channelRef.current && currentUser) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'player_state',
                payload: {
                    userId: currentUser.id,
                    isPlaying,
                    time
                }
            });
        }
    }, [currentUser]);

    const onStateChange = useCallback((state: string) => {
        if (state === 'playing') {
            setPlaying(true);
            playerRef.current?.getCurrentTime().then((time: number) => {
                broadcastState(true, time);
            });
        } else if (state === 'paused') {
            setPlaying(false);
            playerRef.current?.getCurrentTime().then((time: number) => {
                broadcastState(false, time);
            });
        } else if (state === 'buffering') {
            // Send pause to others while we buffer
            playerRef.current?.getCurrentTime().then((time: number) => {
                broadcastState(false, time);
            });
        }
    }, [broadcastState]);

    const onFullScreenChange = useCallback((isFull: boolean) => {
        setIsFullScreen(isFull);
        if (isFull) {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        } else {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        }
    }, []);

    const handleBack = () => {
        router.back();
    };

    const handleKick = (userId: string) => {
        if (!isHost) return;
        channelRef.current?.send({
            type: 'broadcast',
            event: 'kick',
            payload: { targetUserId: userId }
        });
    };

    const fetchFriends = async () => {
        if (!currentUser) return;
        const { data, error } = await supabase
            .from('friendships')
            .select(`
                id,
                user_id1:users!friendships_user_id1_fkey(id, name, image, phone),
                user_id2:users!friendships_user_id2_fkey(id, name, image, phone)
            `)
            .eq('status', 'accepted')
            .or(`user_id1.eq.${currentUser.id},user_id2.eq.${currentUser.id}`);
            
        if (data && !error) {
            const friendList = data.map((f: any) => 
                f.user_id1.id === currentUser.id ? f.user_id2 : f.user_id1
            ).filter(f => f && !participants.find(p => p.id === f.id));
            setFriends(friendList);
        }
    };

    const openInviteModal = () => {
        fetchFriends();
        setInviteModalVisible(true);
    };

    const sendInvite = async (friendId: string, friendName: string) => {
        if (!currentUser || inviting || inviteCooldown) return;
        
        if (participants.length >= 15) {
            Alert.alert("Theater Full", "Maximum 15 participants allowed in a watch party.");
            return;
        }

        setInviting(true);
        setInviteCooldown(true);
        setTimeout(() => setInviteCooldown(false), 5000);

        if (!isHost) {
            // Ask for permission
            channelRef.current?.send({
                type: 'broadcast',
                event: 'access_request',
                payload: {
                    requesterId: currentUser.id,
                    requesterName: currentUser.name,
                    targetFriendId: friendId,
                    targetFriendName: friendName
                }
            });
            setInviting(false);
            setInviteModalVisible(false);
            Alert.alert("Request Sent", "Waiting for the Host to approve your invite...");
            return;
        }

        const ids = [currentUser.id, friendId].sort();
        const friendChatId = `${ids[0]}_${ids[1]}`;
        const time = await playerRef.current?.getCurrentTime() || 0;

        const initialState = {
            partyId: roomId,
            videoId,
            hostId: hostId,
            invite_status: 'pending',
            createdAt: new Date().toISOString(),
            status: playing ? 'playing' : 'paused',
            currentTime: time
        };

        const { error } = await supabase.from('messages').insert({
            chat_id: friendChatId,
            sender_id: currentUser.id,
            message: JSON.stringify(initialState),
            message_type: 'watch_party'
        });

        setInviting(false);
        if (!error) {
            Alert.alert("Invited! 🍿", "Movie ticket sent to your friend.");
            setInviteModalVisible(false);
        } else {
            Alert.alert("Error", "Could not send invite.");
        }
    };

    return (
        <View style={styles.container}>
            {reactions.map(r => (
                <AnimatedReaction key={r.id} emoji={r.emoji} left={r.left} />
            ))}
            
            {!isFullScreen && (
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                        <Ionicons name="chevron-down" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Cinema Mode</Text>
                    <View style={{ width: 28 }} />
                </View>
            )}

            <View style={[styles.playerWrapper, { width, height: isFullScreen ? height : width * (9 / 16) }]}>
                <YoutubeIframe
                    ref={playerRef}
                    height={isFullScreen ? height : width * (9 / 16)} // 16:9 aspect ratio or fullscreen
                    width={width}
                    play={playing}
                    videoId={videoId as string}
                    onChangeState={onStateChange}
                    onReady={() => setLoading(false)}
                    onError={(e) => setPartyStatus('Error loading video!')}
                    onFullScreenChange={onFullScreenChange}
                    initialPlayerParams={{
                        controls: true,
                        modestbranding: true,
                        rel: false,
                    }}
                />
                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#EAB308" />
                    </View>
                )}
            </View>

            {!isFullScreen && (
                <View style={styles.controlsArea}>
                    {partyStatus ? (
                        <Animated.Text style={[styles.statusText, { opacity: pulseAnim }]}>{partyStatus}</Animated.Text>
                    ) : (
                    <Animated.Text style={[styles.syncText, { opacity: pulseAnim }]}>
                        <Ionicons name="sync" size={14} color="#10B981" /> Live Sync Active
                    </Animated.Text>
                )}

                <View style={styles.premiumInfoCard}>
                    <View style={styles.iconGlow}>
                        <Ionicons name="film" size={24} color="#EAB308" />
                    </View>
                    <Text style={styles.infoText}>
                        Watch together in real-time. If anyone pauses, rewinds, or buffers, it syncs instantly for both.
                    </Text>
                </View>

                {/* Participants Section */}
                <View style={styles.participantsContainer}>
                    <Text style={styles.sectionTitle}>Watching Now ({participants.length})</Text>
                    <FlatList
                        data={participants}
                        horizontal
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.participantAvatar}>
                                {item.avatar ? (
                                    <Image source={{ uri: item.avatar }} style={styles.avatarImg} />
                                ) : (
                                    <View style={styles.avatarFallback}>
                                        <Text style={styles.avatarFallbackText}>{item.name?.charAt(0) || '?'}</Text>
                                    </View>
                                )}
                                <Text style={styles.participantName} numberOfLines={1}>{item.name?.split(' ')[0]}</Text>
                                {isHost && item.id !== currentUser?.id && (
                                    <TouchableOpacity style={styles.kickBtn} onPress={() => handleKick(item.id)}>
                                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 16 }}
                    />
                </View>

                {/* Reaction Bar */}
                <View style={styles.reactionBar}>
                    {['👍', '😂', '😮', '😢', '❤️'].map(emoji => (
                        <TouchableOpacity key={emoji} onPress={() => sendReaction(emoji)} style={styles.reactionBtn}>
                            <Text style={styles.reactionEmoji}>{emoji}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity 
                    style={[styles.inviteBtn, inviteCooldown && { opacity: 0.5 }]} 
                    onPress={openInviteModal} 
                    activeOpacity={0.8}
                    disabled={inviteCooldown}
                >
                    <Ionicons name="person-add" size={22} color="white" />
                    <Text style={styles.callBtnText}>Invite Friend</Text>
                </TouchableOpacity>
            </View>
            )}

            {/* Invite Modal */}
            <Modal visible={inviteModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Invite Friends</Text>
                            <TouchableOpacity onPress={() => setInviteModalVisible(false)}>
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={friends}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <View style={styles.friendRow}>
                                    {item.image ? (
                                        <Image source={{ uri: item.image }} style={styles.friendImg} />
                                    ) : (
                                        <View style={styles.friendImgFallback}><Text style={{ color: 'white' }}>{item.name?.charAt(0)}</Text></View>
                                    )}
                                    <Text style={styles.friendName}>{item.name}</Text>
                                    <TouchableOpacity style={styles.sendInviteBtn} onPress={() => sendInvite(item.id, item.name)}>
                                        <Text style={styles.sendInviteText}>Send Ticket</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            ListEmptyComponent={<Text style={{ color: '#94A3B8', textAlign: 'center', marginTop: 20 }}>No friends found or all are already watching!</Text>}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A', // Deep dark theme
        position: 'relative',
    },
    floatingReaction: {
        position: 'absolute',
        bottom: 100,
        fontSize: 32,
        zIndex: 999,
        elevation: 999,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: '#1E293B',
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    playerWrapper: {
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlsArea: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
    },
    participantsContainer: {
        width: '100%',
        marginTop: 10,
        marginBottom: 30,
    },
    sectionTitle: {
        color: '#94A3B8',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    participantAvatar: {
        alignItems: 'center',
        position: 'relative',
        width: 60,
    },
    avatarImg: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#10B981',
    },
    avatarFallback: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#10B981',
    },
    avatarFallbackText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    participantName: {
        color: '#E2E8F0',
        fontSize: 12,
        marginTop: 6,
        textAlign: 'center',
    },
    kickBtn: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#0F172A',
        borderRadius: 12,
    },
    inviteBtn: {
        backgroundColor: '#EAB308',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 30,
        gap: 12,
        shadowColor: '#EAB308',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1E293B',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    friendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        backgroundColor: '#0F172A',
        padding: 12,
        borderRadius: 12,
    },
    friendImg: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
    friendImgFallback: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    friendName: { color: 'white', fontSize: 16, flex: 1 },
    sendInviteBtn: {
        backgroundColor: '#EAB308',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    sendInviteText: {
        color: '#0F172A',
        fontWeight: 'bold',
        fontSize: 12,
    },
    statusText: {
        color: '#EAB308',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 20,
    },
    syncText: {
        color: '#10B981',
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 24,
        letterSpacing: 0.5,
    },
    premiumInfoCard: {
        backgroundColor: '#1E293B',
        padding: 20,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        width: '100%',
        marginBottom: 40,
        borderWidth: 1,
        borderColor: '#334155',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    iconGlow: {
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        padding: 12,
        borderRadius: 12,
    },
    infoText: {
        color: '#E2E8F0',
        flex: 1,
        fontSize: 14,
        lineHeight: 22,
        fontWeight: '500',
    },
    premiumCallBtn: {
        backgroundColor: '#3B82F6',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 30,
        gap: 12,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    callBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 0.5,
    },
    reactionBar: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 24,
        backgroundColor: '#1E293B',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: '#334155',
    },
    reactionBtn: {
        padding: 4,
    },
    reactionEmoji: {
        fontSize: 28,
    }
});
