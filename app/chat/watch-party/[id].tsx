import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, ActivityIndicator, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import YoutubeIframe from 'react-native-youtube-iframe';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useCallManager } from '@/hooks/useCallManager';
import { useCallStore } from '@/store/useCallStore';

export default function WatchPartyScreen() {
    const { width, height } = useWindowDimensions();
    const { id: roomId, videoId, messageId } = useLocalSearchParams();
    const router = useRouter();
    const currentUser = useAuthStore(state => state.user);
    const { handleStartCall } = useCallManager(currentUser, [], false); // Just for starting call if needed

    const [playing, setPlaying] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [loading, setLoading] = useState(true);
    const [partyStatus, setPartyStatus] = useState('Joining Cinema...');
    const [isFullScreen, setIsFullScreen] = useState(false);
    
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

        const channel = supabase.channel(`watch_party_${roomId}`);

        channel
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

    return (
        <View style={styles.container}>
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

                {/* Optional: Add a quick button to start call if not in call */}
                {!useCallStore.getState().callSession && (
                    <TouchableOpacity 
                        style={styles.premiumCallBtn} 
                        onPress={() => handleStartCall(true)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="videocam" size={22} color="white" />
                        <Text style={styles.callBtnText}>Start PiP Video Call</Text>
                    </TouchableOpacity>
                )}
            </View>
            )}
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
    }
});
