import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import YoutubeIframe from 'react-native-youtube-iframe';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useCallManager } from '@/hooks/useCallManager';
import { useCallStore } from '@/store/useCallStore';

const { width } = Dimensions.get('window');

export default function WatchPartyScreen() {
    const { id: roomId, videoId, messageId } = useLocalSearchParams();
    const router = useRouter();
    const currentUser = useAuthStore(state => state.user);
    const { handleStartCall } = useCallManager(currentUser, [], false); // Just for starting call if needed

    const [playing, setPlaying] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [loading, setLoading] = useState(true);
    const [partyStatus, setPartyStatus] = useState('Joining Cinema...');
    
    const playerRef = useRef<any>(null);
    const channelRef = useRef<any>(null);

    // Minimize call if active
    useEffect(() => {
        const callSession = useCallStore.getState().callSession;
        if (callSession && !useCallStore.getState().isMinimized) {
            useCallStore.getState().setMinimized(true);
        }
    }, []);

    // Setup Supabase Realtime Channel for Sync
    useEffect(() => {
        if (!roomId || !currentUser) return;

        const channel = supabase.channel(`watch_party_${roomId}`);

        channel
            .on('broadcast', { event: 'player_state' }, (payload) => {
                // Ignore our own events
                if (payload.payload.userId === currentUser.id) return;

                const { isPlaying, time } = payload.payload;
                
                if (isPlaying !== playing) {
                    setPlaying(isPlaying);
                }

                // If time difference is > 2 seconds, sync it
                playerRef.current?.getCurrentTime().then((myTime: number) => {
                    if (Math.abs(myTime - time) > 2) {
                        playerRef.current?.seekTo(time, true);
                    }
                });
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    setPartyStatus('Connected to Cinema 🍿');
                    setTimeout(() => setPartyStatus(''), 3000);
                }
            });

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, currentUser]);

    const broadcastState = useCallback((isPlaying: boolean, time: number) => {
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
            // Optional: Pause others if buffering
        }
    }, [broadcastState]);

    const handleBack = () => {
        router.back();
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                    <Ionicons name="chevron-down" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Cinema Mode</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.playerWrapper}>
                <YoutubeIframe
                    ref={playerRef}
                    height={width * (9 / 16)} // 16:9 aspect ratio
                    width={width}
                    play={playing}
                    videoId={videoId as string}
                    onChangeState={onStateChange}
                    onReady={() => setLoading(false)}
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

            <View style={styles.controlsArea}>
                {partyStatus ? (
                    <Text style={styles.statusText}>{partyStatus}</Text>
                ) : (
                    <Text style={styles.syncText}>
                        <Ionicons name="sync" size={14} color="#10B981" /> Auto-sync is Active
                    </Text>
                )}

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={24} color="#94A3B8" />
                    <Text style={styles.infoText}>
                        Turn on Video Call to see your friend! If you pause or rewind the video, it will automatically sync for everyone.
                    </Text>
                </View>

                {/* Optional: Add a quick button to start call if not in call */}
                {!useCallStore.getState().callSession && (
                    <TouchableOpacity 
                        style={styles.callBtn} 
                        onPress={() => handleStartCall(true)}
                    >
                        <Ionicons name="videocam" size={20} color="white" />
                        <Text style={styles.callBtnText}>Start Video Call</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A', // Deep dark theme
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
        width: width,
        height: width * (9 / 16),
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
    statusText: {
        color: '#EAB308',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 20,
    },
    syncText: {
        color: '#10B981',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 20,
    },
    infoBox: {
        backgroundColor: '#1E293B',
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        marginBottom: 30,
    },
    infoText: {
        color: '#CBD5E1',
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
    callBtn: {
        backgroundColor: '#3B82F6',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 30,
        gap: 8,
    },
    callBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
