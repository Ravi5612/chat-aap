import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import GameInviteOverlay from './GameInviteOverlay';

interface RacingState {
    status: 'pending' | 'active' | 'expired' | 'declined';
    hostId: string;
    createdAt: string;
    playerHost: string;
    playerGuest: string | null;
    seed: number;
    winner: string | null;
}

const WIDGET_WIDTH = 320;
const WIDGET_HEIGHT = 400;
const ROAD_HORIZON_Y = 100;

// Pseudo-Random number generator based on seed
function mulberry32(a: number) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

export default function RacingWidget({ message, currentUserId }: { message: any, currentUserId: string }) {
    let gameState: RacingState;
    try {
        gameState = JSON.parse(message.message);
    } catch (e) {
        return <Text style={{ color: 'red' }}>Corrupted Game Data</Text>;
    }

    const isHost = currentUserId === gameState.playerHost;
    const isPlaying = gameState.status === 'active' && !gameState.winner;

    return (
        <GameInviteOverlay gameName="Racing 🏎️" gameState={gameState} currentUserId={currentUserId} messageId={message.id}>
            <RacingEngine 
                gameState={gameState} 
                currentUserId={currentUserId} 
                isHost={isHost} 
                isPlaying={isPlaying} 
                messageId={message.id} 
            />
        </GameInviteOverlay>
    );
}

function RacingEngine({ gameState, currentUserId, isHost, isPlaying, messageId }: any) {
    const [score, setScore] = useState(0);
    const [health, setHealth] = useState(3);
    const [opponentScore, setOpponentScore] = useState(0);
    const [opponentHealth, setOpponentHealth] = useState(3);
    const [myLane, setMyLane] = useState(0); // -1: Left, 0: Center, 1: Right
    const [opponentLane, setOpponentLane] = useState(0);
    const [obstacles, setObstacles] = useState<any[]>([]);

    const requestRef = useRef<number>();
    const lastTimeRef = useRef<number>(0);
    const channelRef = useRef<any>(null);
    const myLaneRef = useRef(0);
    const healthRef = useRef(3);
    const scoreRef = useRef(0);
    const zPosRef = useRef(0);
    const rngRef = useRef<() => number>(mulberry32(gameState.seed || 12345));

    // For obstacle generation
    const nextObstacleZRef = useRef(100);

    // Sync loop
    const lastSyncRef = useRef<number>(0);

    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        if (!isPlaying) return;

        // Setup Supabase Realtime
        const channel = supabase.channel(`racing_${messageId}`);
        channel.on('broadcast', { event: 'sync' }, ({ payload }) => {
            if (payload.userId !== currentUserId) {
                setOpponentLane(payload.lane);
                setOpponentScore(payload.score);
                setOpponentHealth(payload.health);
                
                // If opponent died, we win
                if (payload.health <= 0) {
                    endGame(currentUserId);
                }
            }
        }).subscribe();
        channelRef.current = channel;

        // Start Loop
        requestRef.current = requestAnimationFrame(gameLoop);

        return () => {
            isMountedRef.current = false;
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            supabase.removeChannel(channel);
        };
    }, [isPlaying]);

    const gameLoop = (time: number) => {
        if (!isMountedRef.current) return;
        if (!lastTimeRef.current) lastTimeRef.current = time;
        const dt = (time - lastTimeRef.current) / 1000;
        lastTimeRef.current = time;

        if (healthRef.current <= 0) return; // Dead

        // Speed depends on health (more health = faster)
        const speed = 50 * (healthRef.current / 3); 
        
        zPosRef.current += speed * dt;
        scoreRef.current = Math.floor(zPosRef.current);
        setScore(scoreRef.current);

        // Win condition: 10,000 meters
        if (scoreRef.current >= 10000) {
            endGame(currentUserId);
            return;
        }

        // Generate obstacles deterministically
        if (zPosRef.current + 200 > nextObstacleZRef.current) {
            const lane = Math.floor(rngRef.current() * 3) - 1; // -1, 0, 1
            const type = rngRef.current() > 0.5 ? 'rock' : 'car';
            setObstacles(prev => [...prev, { id: Math.random(), lane, z: nextObstacleZRef.current, type }]);
            nextObstacleZRef.current += 50 + (rngRef.current() * 100); // 50 to 150 units apart
        }

        // Move and filter obstacles
        setObstacles(prev => {
            const next = [];
            for (let obs of prev) {
                const relativeZ = obs.z - zPosRef.current;
                
                // Collision Detection (if relativeZ is near 0 and lane matches)
                if (relativeZ < 5 && relativeZ > -5 && obs.lane === myLaneRef.current) {
                    // Hit!
                    if (!obs.hit) {
                        obs.hit = true;
                        handleCrash();
                    }
                }

                if (relativeZ > -20) {
                    next.push(obs); // Keep if not passed too far behind
                }
            }
            return next;
        });

        // Sync with opponent (10 times a sec)
        if (time - lastSyncRef.current > 100) {
            channelRef.current?.send({
                type: 'broadcast',
                event: 'sync',
                payload: {
                    userId: currentUserId,
                    lane: myLaneRef.current,
                    score: scoreRef.current,
                    health: healthRef.current
                }
            });
            lastSyncRef.current = time;
        }

        requestRef.current = requestAnimationFrame(gameLoop);
    };

    const handleCrash = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        healthRef.current -= 1;
        setHealth(healthRef.current);

        if (healthRef.current <= 0) {
            // I died. Opponent wins.
            const opponentId = isHost ? gameState.playerGuest : gameState.playerHost;
            endGame(opponentId || currentUserId); // Fallback to me if solo testing
        }
    };

    const endGame = async (winnerId: string) => {
        if (!isPlaying) return;
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        
        const newState = { ...gameState, winner: winnerId };
        await supabase.from('messages').update({ message: JSON.stringify(newState) }).eq('id', messageId);
    };

    const steer = (dir: -1 | 1) => {
        if (healthRef.current <= 0) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        let newLane = myLaneRef.current + dir;
        if (newLane < -1) newLane = -1;
        if (newLane > 1) newLane = 1;
        myLaneRef.current = newLane;
        setMyLane(newLane);
    };

    // Rendering Helpers (Pseudo 3D)
    const renderObstacle = (obs: any) => {
        const relativeZ = obs.z - zPosRef.current;
        if (relativeZ < 0) return null;

        // Perspective Math
        const zScale = 100 / (100 + relativeZ); // 1 at z=0, ~0.3 at z=200
        const yPos = ROAD_HORIZON_Y + (WIDGET_HEIGHT - ROAD_HORIZON_Y) * (1 - zScale);
        const laneWidth = WIDGET_WIDTH * zScale;
        const xPos = (WIDGET_WIDTH / 2) + (obs.lane * (laneWidth / 3));

        const size = 60 * zScale;

        return (
            <View key={obs.id} style={[
                styles.obstacle, 
                { 
                    left: xPos - size/2, 
                    top: yPos - size/2, 
                    width: size, 
                    height: size,
                    opacity: obs.hit ? 0.3 : Math.min(1, zScale * 2)
                }
            ]}>
                <Text style={{ fontSize: size * 0.6 }}>{obs.type === 'rock' ? '🪨' : '🚙'}</Text>
            </View>
        );
    };

    const renderCar = (lane: number, isOpponent: boolean, carHealth: number) => {
        if (carHealth <= 0) return null;

        // Car is at relativeZ = 0, so zScale = 1
        const yPos = WIDGET_HEIGHT - 60;
        const xPos = (WIDGET_WIDTH / 2) + (lane * (WIDGET_WIDTH / 3));

        return (
            <View style={[
                styles.car, 
                { 
                    left: xPos - 30, 
                    top: yPos,
                    opacity: isOpponent ? 0.5 : 1
                }
            ]}>
                <Text style={{ fontSize: 40 }}>{isOpponent ? '🚙' : '🏎️'}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.scoreText}>You: {score}m</Text>
                    <Text style={styles.healthText}>{'❤️'.repeat(health)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.scoreText}>Opp: {opponentScore}m</Text>
                    <Text style={styles.healthText}>{'❤️'.repeat(Math.max(0, opponentHealth))}</Text>
                </View>
            </View>

            {/* 3D Viewport */}
            <View style={styles.viewport}>
                {/* Background / Horizon */}
                <View style={styles.sky} />
                <View style={styles.ground} />
                
                {/* Road Polygon (CSS Hack using borders) */}
                <View style={styles.road} />

                {/* Objects */}
                {obstacles.map(renderObstacle)}

                {/* Opponent Car */}
                {renderCar(opponentLane, true, opponentHealth)}

                {/* My Car */}
                {renderCar(myLane, false, health)}

                {/* Game Over Screen */}
                {gameState.winner && (
                    <View style={styles.gameOverOverlay}>
                        <Text style={styles.gameOverText}>
                            {gameState.winner === currentUserId ? '🏆 You Won!' : '💀 You Lost!'}
                        </Text>
                    </View>
                )}
            </View>

            {/* Controls */}
            {isPlaying && (
                <View style={styles.controls}>
                    <TouchableOpacity style={styles.btn} onPress={() => steer(-1)} activeOpacity={0.6}>
                        <Ionicons name="arrow-back" size={32} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btn} onPress={() => steer(1)} activeOpacity={0.6}>
                        <Ionicons name="arrow-forward" size={32} color="white" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: WIDGET_WIDTH,
        backgroundColor: '#1E293B',
        borderRadius: 16,
        overflow: 'hidden',
        alignSelf: 'center',
        elevation: 5,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between',
        padding: 12, backgroundColor: '#0F172A'
    },
    scoreText: { color: 'white', fontWeight: 'bold', fontSize: 16, fontVariant: ['tabular-nums'] },
    healthText: { fontSize: 14, marginTop: 4 },
    viewport: {
        width: WIDGET_WIDTH,
        height: WIDGET_HEIGHT,
        position: 'relative',
        backgroundColor: '#87CEEB', // Sky
    },
    sky: {
        position: 'absolute', top: 0, width: '100%', height: ROAD_HORIZON_Y,
        backgroundColor: '#1E40AF'
    },
    ground: {
        position: 'absolute', top: ROAD_HORIZON_Y, width: '100%', height: WIDGET_HEIGHT - ROAD_HORIZON_Y,
        backgroundColor: '#166534' // Grass
    },
    road: {
        position: 'absolute',
        top: ROAD_HORIZON_Y,
        left: '10%',
        width: '80%',
        height: WIDGET_HEIGHT - ROAD_HORIZON_Y,
        backgroundColor: '#334155',
        // In web/RN we can't easily do trapezoids without SVG or border hacks.
        // For simplicity, a straight road that narrows at top using scaleX
        transform: [
            { perspective: 200 },
            { rotateX: '60deg' },
            { scaleY: 2 }
        ],
        transformOrigin: 'top' // RN doesn't fully support this easily on all versions, so we use simpler math if needed.
    },
    obstacle: {
        position: 'absolute',
        justifyContent: 'center', alignItems: 'center'
    },
    car: {
        position: 'absolute',
        width: 60, height: 60,
        justifyContent: 'center', alignItems: 'center'
    },
    controls: {
        flexDirection: 'row', justifyContent: 'space-between',
        padding: 16, backgroundColor: '#0F172A'
    },
    btn: {
        backgroundColor: '#3B82F6', width: 80, height: 60,
        borderRadius: 16, justifyContent: 'center', alignItems: 'center'
    },
    gameOverOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center', alignItems: 'center'
    },
    gameOverText: {
        color: '#FDE047', fontSize: 32, fontWeight: '900',
        textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4
    }
});
