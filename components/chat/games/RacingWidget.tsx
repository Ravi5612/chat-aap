import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder } from 'react-native';
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
    config?: {
        distance: number;
        catchUp: boolean;
        powerUps: boolean;
        trafficDensity: 'easy' | 'normal' | 'hard';
    };
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
    const [obstaclesState, setObstaclesState] = useState<any[]>([]);

    const [coins, setCoins] = useState(0);
    const [nitroMeter, setNitroMeter] = useState(0);
    const [isNitroActive, setIsNitroActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [invincibleUntil, setInvincibleUntil] = useState(0); // To cause blink

    const requestRef = useRef<number>();
    const lastTimeRef = useRef<number>(0);
    const channelRef = useRef<any>(null);
    const myLaneRef = useRef(0);
    const healthRef = useRef(3);
    const scoreRef = useRef(0);
    const zPosRef = useRef(0);
    
    const coinsRef = useRef(0);
    const nitroMeterRef = useRef(0);
    const isNitroActiveRef = useRef(false);
    const isPausedRef = useRef(false);
    const invincibleUntilRef = useRef(0);
    const nearMissCooldownsRef = useRef(new Set<number>());

    const rngRef = useRef<() => number>(mulberry32(gameState.seed || 12345));

    const config = gameState.config || { distance: 3000, catchUp: true, powerUps: true, trafficDensity: 'normal' };

    // For obstacle generation
    const nextObstacleZRef = useRef(100);
    const obstaclesRef = useRef<any[]>([]);

    // Sync loop
    const lastSyncRef = useRef<number>(0);
    const lastRenderRef = useRef<number>(0);

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

        if (isPausedRef.current) {
            requestRef.current = requestAnimationFrame(gameLoop);
            return;
        }

        if (healthRef.current <= 0) return; // Dead

        let baseSpeed = 50;
        if (zPosRef.current > 3000) baseSpeed = 75;
        else if (zPosRef.current > 1000) baseSpeed = 60;

        if (config.catchUp && opponentScore > scoreRef.current + 300) {
            baseSpeed *= 1.2;
        }

        if (time < invincibleUntilRef.current) {
            baseSpeed *= 0.6; // Speed penalty during recovery
        }

        let speed = baseSpeed;
        if (isNitroActiveRef.current) {
            speed *= 2.5; // Nitro speed!
        }
        
        zPosRef.current += speed * dt;
        scoreRef.current += Math.floor(speed * dt); // Distance adds to score

        // Flash invincibility update
        if (invincibleUntil !== invincibleUntilRef.current && time > invincibleUntilRef.current) {
            setInvincibleUntil(0);
        }

        // Win condition
        if (config.distance !== -1 && scoreRef.current >= config.distance) {
            endGame(currentUserId);
            return;
        }

        // Generate obstacles
        const baseSpacing = config.trafficDensity === 'hard' ? 30 : config.trafficDensity === 'easy' ? 80 : 50;
        const rngSpacing = config.trafficDensity === 'hard' ? 50 : config.trafficDensity === 'easy' ? 150 : 100;

        if (zPosRef.current + 200 > nextObstacleZRef.current) {
            const lane = Math.floor(rngRef.current() * 3) - 1; // -1, 0, 1
            const typeRng = rngRef.current();
            let type = 'rock';
            if (config.powerUps) {
                if (typeRng > 0.85) type = 'nitro_item';
                else if (typeRng > 0.6) type = 'coin';
                else if (typeRng > 0.3) type = 'car';
            } else {
                if (typeRng > 0.5) type = 'car';
            }
            obstaclesRef.current.push({ id: Math.random(), lane, z: nextObstacleZRef.current, type });
            nextObstacleZRef.current += baseSpacing + (rngRef.current() * rngSpacing);
        }

        // Move and filter obstacles
        const nextObstacles = [];
        for (let obs of obstaclesRef.current) {
            const relativeZ = obs.z - zPosRef.current;
            
            // Collision Detection
            if (relativeZ < 5 && relativeZ > -5 && obs.lane === myLaneRef.current) {
                if (!obs.hit) {
                    obs.hit = true;
                    if (obs.type === 'rock' || obs.type === 'car') {
                        if (time > invincibleUntilRef.current && !isNitroActiveRef.current) {
                            handleCrash(time);
                        } else if (isNitroActiveRef.current) {
                            // Plow through
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                        }
                    } else if (obs.type === 'coin') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        coinsRef.current += 10;
                        setCoins(coinsRef.current);
                        nitroMeterRef.current = Math.min(100, nitroMeterRef.current + 10);
                        setNitroMeter(nitroMeterRef.current);
                    } else if (obs.type === 'nitro_item') {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        nitroMeterRef.current = Math.min(100, nitroMeterRef.current + 30);
                        setNitroMeter(nitroMeterRef.current);
                    }
                }
            }

            // Near Miss Detection
            if (relativeZ < 10 && relativeZ > -10 && Math.abs(obs.lane - myLaneRef.current) === 1 && (obs.type === 'rock' || obs.type === 'car')) {
                if (!nearMissCooldownsRef.current.has(obs.id) && !obs.hit) {
                    nearMissCooldownsRef.current.add(obs.id);
                    scoreRef.current += 100;
                    nitroMeterRef.current = Math.min(100, nitroMeterRef.current + 15);
                    setNitroMeter(nitroMeterRef.current);
                }
            }

            if (relativeZ > -20 && (!obs.hit || obs.type === 'rock' || obs.type === 'car')) {
                nextObstacles.push(obs); 
            }
        }
        obstaclesRef.current = nextObstacles;

        // Throttle React Re-renders to ~25fps (every 40ms) instead of 60fps
        if (time - lastRenderRef.current > 40) {
            setScore(scoreRef.current);
            setObstaclesState([...nextObstacles]);
            lastRenderRef.current = time;
        }

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

    const handleCrash = (time: number) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        healthRef.current -= 1;
        setHealth(healthRef.current);
        
        invincibleUntilRef.current = time + 2000;
        setInvincibleUntil(invincibleUntilRef.current);

        if (healthRef.current <= 0) {
            const opponentId = isHost ? gameState.playerGuest : gameState.playerHost;
            endGame(opponentId || currentUserId);
        }
    };

    const endGame = async (winnerId: string) => {
        if (!isPlaying) return;
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        
        const newState = { ...gameState, winner: winnerId };
        await supabase.from('messages').update({ message: JSON.stringify(newState) }).eq('id', messageId);
    };

    const steer = (dir: -1 | 1) => {
        if (healthRef.current <= 0 || isPausedRef.current) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        let newLane = myLaneRef.current + dir;
        if (newLane < -1) newLane = -1;
        if (newLane > 1) newLane = 1;
        myLaneRef.current = newLane;
        setMyLane(newLane);
    };

    const triggerNitro = () => {
        if (nitroMeterRef.current >= 100 && !isNitroActiveRef.current) {
            isNitroActiveRef.current = true;
            setIsNitroActive(true);
            nitroMeterRef.current = 0;
            setNitroMeter(0);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => {
                isNitroActiveRef.current = false;
                setIsNitroActive(false);
            }, 3000);
        }
    };

    const togglePause = () => {
        isPausedRef.current = !isPausedRef.current;
        setIsPaused(isPausedRef.current);
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderRelease: (e, gestureState) => {
                if (Math.abs(gestureState.dx) > 30) {
                    if (gestureState.dx > 0) steer(1);
                    else steer(-1);
                }
            }
        })
    ).current;

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
                <Text style={{ fontSize: size * 0.6 }}>
                    {obs.type === 'rock' ? '🪨' : obs.type === 'car' ? '🚙' : obs.type === 'coin' ? '🪙' : '⚡'}
                </Text>
            </View>
        );
    };

    const renderCar = (lane: number, isOpponent: boolean, carHealth: number) => {
        if (carHealth <= 0) return null;

        // Car is at relativeZ = 0, so zScale = 1
        const yPos = WIDGET_HEIGHT - 60;
        const xPos = (WIDGET_WIDTH / 2) + (lane * (WIDGET_WIDTH / 3));

        const isBlinking = !isOpponent && invincibleUntil > 0 && Math.floor(Date.now() / 100) % 2 === 0;

        return (
            <View style={[
                styles.car, 
                { 
                    left: xPos - 30, 
                    top: yPos,
                    opacity: isOpponent ? 0.5 : (isBlinking ? 0.2 : 1),
                    transform: isOpponent ? [] : [{ rotate: myLaneRef.current === -1 ? '-10deg' : myLaneRef.current === 1 ? '10deg' : '0deg' }]
                }
            ]}>
                <Text style={{ fontSize: 40 }}>{isOpponent ? '🚙' : (isNitroActive ? '🚀' : '🏎️')}</Text>
            </View>
        );
    };

    const stripeOffset = (score % 20) * 10;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.scoreText}>You: {score}</Text>
                    <Text style={styles.scoreText}>🪙 {coins}</Text>
                    <Text style={styles.healthText}>{'❤️'.repeat(health)}</Text>
                </View>
                {isPlaying && (
                    <TouchableOpacity onPress={togglePause} style={{ padding: 8 }}>
                        <Ionicons name={isPaused ? "play" : "pause"} size={24} color="white" />
                    </TouchableOpacity>
                )}
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.scoreText}>Opp: {opponentScore}</Text>
                    <Text style={styles.healthText}>{'❤️'.repeat(Math.max(0, opponentHealth))}</Text>
                </View>
            </View>

            {/* 3D Viewport */}
            <View style={styles.viewport} {...panResponder.panHandlers}>
                {/* Background / Horizon */}
                <View style={styles.sky} />
                <View style={styles.ground} />
                
                <View style={styles.road}>
                    <View style={[styles.stripe, { top: stripeOffset }]} />
                    <View style={[styles.stripe, { top: stripeOffset + 100 }]} />
                    <View style={[styles.stripe, { top: stripeOffset + 200 }]} />
                </View>

                {/* Objects */}
                {obstaclesState.map(renderObstacle)}

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
                {isPaused && (
                    <View style={styles.gameOverOverlay}>
                        <Text style={styles.gameOverText}>PAUSED</Text>
                    </View>
                )}
            </View>

            {/* Controls */}
            {isPlaying && (
                <View style={styles.controls}>
                    <TouchableOpacity 
                        style={[styles.nitroBtn, nitroMeter >= 100 && styles.nitroBtnReady]} 
                        onPress={triggerNitro} 
                        activeOpacity={0.6}
                    >
                        <Text style={styles.nitroText}>{nitroMeter >= 100 ? '🔥 NITRO' : `Boost ${nitroMeter}%`}</Text>
                    </TouchableOpacity>
                    <Text style={styles.swipeHint}>◀ Swipe to Steer ▶</Text>
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
        transform: [
            { perspective: 200 },
            { rotateX: '60deg' },
            { scaleY: 2 }
        ],
        alignItems: 'center',
        overflow: 'hidden'
    },
    stripe: {
        width: 10,
        height: 60,
        backgroundColor: '#F8FAFC',
        position: 'absolute'
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
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, backgroundColor: '#0F172A'
    },
    nitroBtn: {
        backgroundColor: '#475569',
        paddingVertical: 12, paddingHorizontal: 24,
        borderRadius: 24,
    },
    nitroBtnReady: {
        backgroundColor: '#EF4444',
        shadowColor: '#EF4444', shadowOpacity: 0.8, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 5
    },
    nitroText: {
        color: 'white', fontWeight: 'bold', fontSize: 16
    },
    swipeHint: {
        color: '#64748B', fontWeight: 'bold', fontSize: 14, fontStyle: 'italic'
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
