import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, Animated, Easing } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { LUDO_SAFE_ZONES, LUDO_MAIN_PATH, LUDO_HOME_PATHS, LUDO_BASE_POSITIONS, LUDO_FINISH_POS, LUDO_COLORS } from '@/utils/ludoConstants';
import GameInviteOverlay from './GameInviteOverlay';
import { LudoState, getValidMoves, calculateNewPosition, checkKillsAndWin } from '@/game/engine/ludoEngine';
import { getNextTurn, saveLudoState } from '@/game/state/ludoStateManager';

const { width } = Dimensions.get('window');
const BOARD_SIZE = Math.min(width - 40, 340);
const CELL_SIZE = BOARD_SIZE / 15;

export default function LudoWidget({ message, currentUserId, onStartCall }: { message: any, currentUserId: string, onStartCall?: (type: 'audio'|'video') => void }) {
    const [updating, setUpdating] = useState(false);
    const [timeLeft, setTimeLeft] = useState(120);
    const [isRolling, setIsRolling] = useState(false);
    
    const soundDice = useRef<Audio.Sound | null>(null);
    const soundMove = useRef<Audio.Sound | null>(null);
    const soundKill = useRef<Audio.Sound | null>(null);
    const soundWin = useRef<Audio.Sound | null>(null);
    
    // Animation refs for dice
    const diceRotation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loadSounds = async () => {
            try {
                const { sound: sD } = await Audio.Sound.createAsync({ uri: 'https://actions.google.com/sounds/v1/foley/rolling_dice.ogg' });
                const { sound: sM } = await Audio.Sound.createAsync({ uri: 'https://actions.google.com/sounds/v1/foley/wood_click.ogg' });
                const { sound: sK } = await Audio.Sound.createAsync({ uri: 'https://actions.google.com/sounds/v1/impacts/wood_hit_metal.ogg' });
                const { sound: sW } = await Audio.Sound.createAsync({ uri: 'https://actions.google.com/sounds/v1/crowds/crowd_cheer.ogg' });
                soundDice.current = sD;
                soundMove.current = sM;
                soundKill.current = sK;
                soundWin.current = sW;
            } catch (e) { }
        };
        loadSounds();
        return () => {
            soundDice.current?.unloadAsync();
            soundMove.current?.unloadAsync();
            soundKill.current?.unloadAsync();
            soundWin.current?.unloadAsync();
        };
    }, []);

    let state: LudoState;
    try {
        state = JSON.parse(message.message);
    } catch (e) {
        return <Text style={{ color: 'red' }}>Corrupted Game Data</Text>;
    }

    // A player can now own multiple colors (teams)
    const myColors: string[] = [];
    for (const [color, id] of Object.entries(state.players || {})) {
        if (id === currentUserId) myColors.push(color);
    }

    const isMyTurn = myColors.includes(state.turn) && !state.winner;
    const canRoll = isMyTurn && state.diceValue === null;
    const mustMove = isMyTurn && state.diceValue !== null;

    useEffect(() => {
        if (state.winner || state.status !== 'active' || !state.lastMoveAt) return;
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - state.lastMoveAt!) / 1000);
            const remaining = Math.max(120 - elapsed, 0);
            setTimeLeft(remaining);
            if (remaining === 0 && !isMyTurn && !state.winner && !updating) {
                claimTimeoutWin();
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [state.lastMoveAt, state.winner, isMyTurn, state.status]);

    const claimTimeoutWin = async () => {
        setUpdating(true);
        const newState: LudoState = {
            ...state,
            winner: myColors[0] || 'Unknown',
            timeoutWinner: currentUserId,
            message: "Opponent timed out!"
        };
        soundWin.current?.replayAsync();
        await saveLudoState(message.id, newState, setUpdating);
    };

    const validMoves = getValidMoves(state, state.turn);

    useEffect(() => {
        if (mustMove && !updating && !state.winner) {
            if (validMoves.length === 0) {
                const timer = setTimeout(() => handleNextTurn(state), 2000);
                return () => clearTimeout(timer);
            } else if (validMoves.length === 1) {
                const timer = setTimeout(() => moveToken(validMoves[0]), 600);
                return () => clearTimeout(timer);
            }
        }
    }, [mustMove, validMoves.length, updating, state.winner, state.turn]);

    const handleNextTurn = async (currentState: LudoState, extraTurn = false) => {
        const nextTurn = getNextTurn(currentState, extraTurn);
        const newState = { ...currentState, turn: nextTurn, diceValue: null };
        await saveLudoState(message.id, newState, setUpdating);
    };

    const rollDice = async () => {
        if (!canRoll || updating || isRolling || myColors.length === 0) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        soundDice.current?.replayAsync();
        setIsRolling(true);
        
        // Dice spin animation
        Animated.timing(diceRotation, {
            toValue: 1,
            duration: 600,
            easing: Easing.linear,
            useNativeDriver: true
        }).start(() => diceRotation.setValue(0));
        
        setTimeout(async () => {
            const roll = Math.floor(Math.random() * 6) + 1;
            const tempState = { ...state, diceValue: roll };
            
            const colorNames: any = { R: 'Red', G: 'Green', Y: 'Yellow', B: 'Blue' };
            let newMsg = `${colorNames[state.turn]} rolled a ${roll}! 🎲`;

            if (state.rules?.tripleSixPenalty && roll === 6) {
                const currentSixes = (state.consecutiveSixes || 0) + 1;
                if (currentSixes === 3) {
                    newMsg = `3 Sixes Penalty! 🚫 Turn Cancelled.`;
                    tempState.diceValue = null;
                    tempState.consecutiveSixes = 0;
                    tempState.turn = getNextTurn(tempState, false);
                    await saveLudoState(message.id, { ...tempState, message: newMsg }, setUpdating);
                    setIsRolling(false);
                    return;
                } else {
                    tempState.consecutiveSixes = currentSixes;
                }
            } else if (roll !== 6) {
                tempState.consecutiveSixes = 0;
            }

            const vMoves = getValidMoves(tempState, tempState.turn);
            if (vMoves.length === 0) {
                newMsg = `${colorNames[tempState.turn]} rolled a ${roll}. No valid moves! 🚫`;
            }

            await saveLudoState(message.id, { ...tempState, message: newMsg }, setUpdating);
            setIsRolling(false);
        }, 600);
    };

    const moveToken = async (tokenIndex: number) => {
        if (!mustMove || updating || state.diceValue === null) return;
        if (!validMoves.includes(tokenIndex)) return;

        Haptics.selectionAsync();
        soundMove.current?.replayAsync();

        const currentPos = state.tokens[state.turn][tokenIndex];
        const newPos = calculateNewPosition(state.turn, currentPos, state.diceValue);

        const { newTokens, extraTurn, killMessage, winner } = checkKillsAndWin(state, state.turn, newPos);
        newTokens[state.turn][tokenIndex] = newPos;

        if (killMessage) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            soundKill.current?.replayAsync();
        }
        if (winner) soundWin.current?.replayAsync();

        const nextTurn = getNextTurn(state, extraTurn);

        const newState: LudoState = {
            ...state,
            tokens: newTokens,
            turn: nextTurn,
            diceValue: null,
            winner,
            message: killMessage || state.message
        };

        if (nextTurn !== state.turn) {
            newState.consecutiveSixes = 0;
        }

        await saveLudoState(message.id, newState, setUpdating);
    };

    const getPosCoords = (color: string, pos: number, tokenIndex: number) => {
        if (pos === -1) return LUDO_BASE_POSITIONS[color][tokenIndex];
        if (pos === 57) return LUDO_FINISH_POS[color];
        if (pos >= 52 && pos <= 56) return LUDO_HOME_PATHS[color][pos - 52];
        return LUDO_MAIN_PATH[pos];
    };

    const boardGrid = React.useMemo(() => {
        const squares = [];
        for (let r = 0; r < 15; r++) {
            for (let c = 0; c < 15; c++) {
                let bgColor = '#F8FAFC';
                if (r < 6 && c < 6) bgColor = '#FECACA'; 
                if (r < 6 && c > 8) bgColor = '#A7F3D0'; 
                if (r > 8 && c > 8) bgColor = '#FDE68A'; 
                if (r > 8 && c < 6) bgColor = '#BFDBFE'; 
                
                if (r >= 1 && r <= 4 && c >= 1 && c <= 4) bgColor = '#FFFFFF';
                if (r >= 1 && r <= 4 && c >= 10 && c <= 13) bgColor = '#FFFFFF';
                if (r >= 10 && r <= 13 && c >= 10 && c <= 13) bgColor = '#FFFFFF';
                if (r >= 10 && r <= 13 && c >= 1 && c <= 4) bgColor = '#FFFFFF';

                if (r === 7 && c >= 1 && c <= 5) bgColor = LUDO_COLORS.R;
                if (c === 7 && r >= 1 && r <= 5) bgColor = LUDO_COLORS.G;
                if (r === 7 && c >= 9 && c <= 13) bgColor = LUDO_COLORS.Y;
                if (c === 7 && r >= 9 && r <= 13) bgColor = LUDO_COLORS.B;
                
                const isSafe = LUDO_SAFE_ZONES.some(zone => {
                    const [zc, zr] = LUDO_MAIN_PATH[zone];
                    return zr === r && zc === c;
                });
                
                if (isSafe && bgColor === '#F8FAFC') bgColor = '#E2E8F0';

                let isCenter = false;
                if (r >= 6 && r <= 8 && c >= 6 && c <= 8) {
                    bgColor = '#1E293B';
                    isCenter = true;
                }

                squares.push(
                    <View key={`${r}-${c}`} style={[styles.cell, { backgroundColor: bgColor }]}>
                        {isSafe && !isCenter && <Ionicons name="star" size={CELL_SIZE*0.6} color="#94A3B8" />}
                        {isCenter && r===7 && c===7 && <Ionicons name="trophy" size={CELL_SIZE*1.2} color="#FBBF24" />}
                    </View>
                );
            }
        }
        return squares;
    }, []);

    const diceSpin = diceRotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    return (
        <GameInviteOverlay gameName="Ludo Pro 🎲" gameState={state} currentUserId={currentUserId} messageId={message.id}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Ludo Pro 👑</Text>
                    {state.message && <Text style={styles.alertText}>{state.message}</Text>}
                </View>

                <View style={styles.boardWrapper}>
                    <View style={styles.board}>
                        <View style={styles.gridContainer}>
                            {boardGrid}
                        </View>

                    {(() => {
                        const tokenPositions: { color: string, i: number, col: number, row: number, pos: number }[] = [];
                        const tokensCount = state.rules?.tokensCount || 4;
                        
                        ['R', 'G', 'Y', 'B'].forEach((color) => {
                            state.tokens[color]?.forEach((pos, i) => {
                                if (i >= tokensCount) return;
                                if (pos === 57) return;
                                const [col, row] = getPosCoords(color, pos, i);
                                tokenPositions.push({ color, i, col, row, pos });
                            });
                        });

                        const cellGroups: Record<string, typeof tokenPositions> = {};
                        tokenPositions.forEach(t => {
                            const key = `${t.col}-${t.row}`;
                            if (!cellGroups[key]) cellGroups[key] = [];
                            cellGroups[key].push(t);
                        });

                        return tokenPositions.map((t) => {
                            const { color, i, col, row, pos } = t;
                            const isSelectable = mustMove && color === state.turn && myColors.includes(color) && validMoves.includes(i);
                            
                            const key = `${col}-${row}`;
                            const group = cellGroups[key];
                            const idx = group.findIndex(g => g.color === color && g.i === i);
                            const total = group.length;
                            
                            let offsetX = 0;
                            let offsetY = 0;
                            if (total > 1 && pos !== -1) {
                                const shift = CELL_SIZE * 0.15;
                                if (total === 2) {
                                    offsetX = idx === 0 ? -shift : shift;
                                    offsetY = idx === 0 ? -shift : shift;
                                } else if (total === 3) {
                                    if (idx === 0) { offsetX = -shift; offsetY = -shift; }
                                    else if (idx === 1) { offsetX = shift; offsetY = -shift; }
                                    else { offsetX = 0; offsetY = shift; }
                                } else {
                                    offsetX = idx % 2 === 0 ? -shift : shift;
                                    offsetY = idx < 2 ? -shift : shift;
                                }
                            }

                            return (
                                <TouchableOpacity
                                    key={`${color}-${i}`}
                                    style={[
                                        styles.token,
                                        { left: col * CELL_SIZE + offsetX, top: row * CELL_SIZE + offsetY },
                                        { backgroundColor: LUDO_COLORS[color as keyof typeof LUDO_COLORS] },
                                        isSelectable && styles.selectableToken
                                    ]}
                                    onPress={() => isSelectable ? moveToken(i) : null}
                                    activeOpacity={isSelectable ? 0.7 : 1}
                                    hitSlop={{top: 24, bottom: 24, left: 24, right: 24}}
                                >
                                    <View style={styles.tokenInner}>
                                        <View style={styles.tokenDot} />
                                    </View>
                                </TouchableOpacity>
                            );
                        });
                    })()}
                    </View>
                </View>

                <View style={styles.statusRow}>
                    {state.winner ? (
                        <Text style={styles.winnerText}>
                            {myColors.includes(state.winner) ? (state.timeoutWinner ? '🎉 You Won (Timeout)!' : '🏆 You Won!') : (state.timeoutWinner ? '⏳ You Lost (Timeout)' : '😔 You Lost!')}
                        </Text>
                    ) : (
                        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View>
                                <Text style={[styles.turnText, { color: LUDO_COLORS[state.turn as keyof typeof LUDO_COLORS] }]}>
                                    {isMyTurn ? "Your Turn" : `${{R:'Red', G:'Green', Y:'Yellow', B:'Blue'}[state.turn]} Player`}
                                </Text>
                                {state.status === 'active' && state.lastMoveAt && (
                                    <Text style={styles.timerText}>
                                        {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? '0' : ''}{timeLeft % 60}
                                    </Text>
                                )}
                            </View>
                            
                            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                                <TouchableOpacity onPress={() => onStartCall?.('audio')} style={styles.callBtn}>
                                    <Ionicons name="mic" size={24} color="#3B82F6" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => onStartCall?.('video')} style={styles.callBtn}>
                                    <Ionicons name="videocam" size={24} color="#10B981" />
                                </TouchableOpacity>
                            </View>
                            
                            <TouchableOpacity 
                                onPress={rollDice}
                                disabled={!canRoll || updating || isRolling}
                                activeOpacity={0.8}
                            >
                                <Animated.View style={[
                                    styles.dice, 
                                    { borderColor: LUDO_COLORS[state.turn as keyof typeof LUDO_COLORS] },
                                    canRoll && styles.dicePulse,
                                    !canRoll && { opacity: 0.6 },
                                    { transform: [{ rotate: diceSpin }] }
                                ]}>
                                    {isRolling ? (
                                        <ActivityIndicator color={LUDO_COLORS[state.turn as keyof typeof LUDO_COLORS]} size="large" />
                                    ) : (
                                        <FontAwesome5 
                                            name={`dice-${['one','two','three','four','five','six'][(state.diceValue || 1) - 1]}`} 
                                            size={36} 
                                            color={LUDO_COLORS[state.turn as keyof typeof LUDO_COLORS]} 
                                        />
                                    )}
                                </Animated.View>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </GameInviteOverlay>
    );
}

const styles = StyleSheet.create({
    container: {
        width: BOARD_SIZE + 24, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 12,
        alignSelf: 'center', marginVertical: 4, elevation: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
    title: { fontWeight: '900', fontSize: 18, color: '#1E293B', letterSpacing: 0.5 },
    alertText: { fontSize: 12, color: '#EF4444', fontWeight: 'bold' },
    boardWrapper: { backgroundColor: '#F8FAFC', padding: 8, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
    board: { width: BOARD_SIZE, height: BOARD_SIZE, position: 'relative', backgroundColor: '#fff', borderWidth: 2, borderColor: '#475569', borderRadius: 8, overflow: 'hidden' },
    gridContainer: { width: BOARD_SIZE, height: BOARD_SIZE, flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: CELL_SIZE, height: CELL_SIZE, justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: '#CBD5E1' },
    token: {
        position: 'absolute', width: CELL_SIZE * 0.8, height: CELL_SIZE * 0.8, margin: CELL_SIZE * 0.1,
        borderRadius: CELL_SIZE, borderWidth: 2, borderColor: 'white', justifyContent: 'center', alignItems: 'center',
        elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 3,
    },
    tokenInner: { width: '60%', height: '60%', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    tokenDot: { width: '40%', height: '40%', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 10 },
    selectableToken: { borderWidth: 3, borderColor: '#FDE047', transform: [{ scale: 1.25 }], shadowColor: '#FDE047', shadowOpacity: 0.8, shadowRadius: 6 },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center', borderRadius: 24 },
    statusRow: { marginTop: 16, paddingHorizontal: 8 },
    turnText: { fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
    timerText: { fontSize: 14, color: '#94A3B8', fontWeight: 'bold', fontVariant: ['tabular-nums'], marginTop: 2 },
    winnerText: { fontSize: 20, fontWeight: 'bold', color: '#10B981', textAlign: 'center', paddingVertical: 12 },
    dice: {
        width: 60, height: 60, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF',
        borderRadius: 16, borderWidth: 3, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1
    },
    dicePulse: { borderColor: '#10B981' }, // simplified pulse since we animate rotation
    callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }
});
