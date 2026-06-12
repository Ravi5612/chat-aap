import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import {
    LUDO_SAFE_ZONES, LUDO_MAIN_PATH, LUDO_HOME_PATHS, 
    LUDO_BASE_POSITIONS, LUDO_FINISH_POS, LUDO_START_INDEX, 
    LUDO_COLORS
} from '@/utils/ludoConstants';

interface LudoState {
    players: Record<string, string>; // { R: 'user_1', Y: 'user_2' }
    turn: 'R' | 'G' | 'Y' | 'B';
    diceValue: number | null;
    tokens: {
        R: number[]; // [-1, -1, -1, -1] -> -1=Base, 0-51=Path, 52-56=Home, 57=Finish
        G: number[];
        Y: number[];
        B: number[];
    };
    winner: string | null;
    message?: string; // e.g. "Red killed Yellow!"
}

const BOARD_SIZE = 270;
const CELL_SIZE = BOARD_SIZE / 15;

export default function LudoWidget({ message, currentUserId }: { message: any, currentUserId: string }) {
    const [updating, setUpdating] = useState(false);

    let state: LudoState;
    try {
        state = JSON.parse(message.message);
    } catch (e) {
        return <Text style={{ color: 'red' }}>Corrupted Game Data</Text>;
    }

    // Determine my color
    let myColor: string | null = null;
    for (const [color, id] of Object.entries(state.players)) {
        if (id === currentUserId) myColor = color;
    }

    const isMyTurn = myColor === state.turn && !state.winner;
    const canRoll = isMyTurn && state.diceValue === null;
    const mustMove = isMyTurn && state.diceValue !== null;

    // ----- LOGIC: Calculate Paths & Validity -----
    const getStepsTaken = (color: string, pos: number) => {
        if (pos === -1) return -1;
        if (pos >= 52) return pos - 52 + 51; // 51 is the threshold
        const start = LUDO_START_INDEX[color];
        return (pos - start + 52) % 52;
    };

    const getValidMoves = () => {
        if (!mustMove || !myColor || state.diceValue === null) return [];
        const roll = state.diceValue;
        const validIndices: number[] = [];

        state.tokens[myColor as keyof typeof state.tokens].forEach((pos, i) => {
            if (pos === 57) return; // Finished
            if (pos === -1) {
                if (roll === 6) validIndices.push(i);
            } else {
                const stepsTaken = getStepsTaken(myColor!, pos);
                if (stepsTaken + roll <= 56) {
                    validIndices.push(i);
                }
            }
        });
        return validIndices;
    };

    const validMoves = getValidMoves();

    // Auto-skip if no valid moves
    if (mustMove && validMoves.length === 0 && !updating) {
        setTimeout(() => handleNextTurn(state), 1000);
    }

    const handleNextTurn = async (currentState: LudoState, extraTurn = false) => {
        const order = ['R', 'G', 'Y', 'B'];
        let nextTurn = currentState.turn;
        
        if (!extraTurn) {
            let idx = order.indexOf(currentState.turn);
            // find next active player
            do {
                idx = (idx + 1) % 4;
            } while (!currentState.players[order[idx]] && idx !== order.indexOf(currentState.turn));
            nextTurn = order[idx] as any;
        }

        const newState = {
            ...currentState,
            turn: nextTurn,
            diceValue: null
        };
        await saveState(newState);
    };

    const saveState = async (newState: LudoState) => {
        setUpdating(true);
        await supabase.from('messages').update({ message: JSON.stringify(newState) }).eq('id', message.id);
        setUpdating(false);
    };

    const rollDice = async () => {
        if (!canRoll || updating) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const roll = Math.floor(Math.random() * 6) + 1;
        await saveState({ ...state, diceValue: roll, message: undefined });
    };

    const moveToken = async (tokenIndex: number) => {
        if (!mustMove || updating || !myColor || state.diceValue === null) return;
        if (!validMoves.includes(tokenIndex)) return;

        Haptics.selectionAsync();
        const roll = state.diceValue;
        const currentPos = state.tokens[myColor as keyof typeof state.tokens][tokenIndex];
        
        let newPos = -1;
        if (currentPos === -1 && roll === 6) {
            newPos = LUDO_START_INDEX[myColor];
        } else {
            const stepsTaken = getStepsTaken(myColor, currentPos);
            if (stepsTaken + roll > 50) {
                // Enter home path
                newPos = 52 + (stepsTaken + roll - 51);
            } else {
                newPos = (currentPos + roll) % 52;
            }
        }

        const newTokens = { ...state.tokens };
        newTokens[myColor as keyof typeof state.tokens] = [...newTokens[myColor as keyof typeof state.tokens]];
        newTokens[myColor as keyof typeof state.tokens][tokenIndex] = newPos;

        let extraTurn = roll === 6;
        let killMessage = '';

        // Check Kill (if on main path and not safe)
        if (newPos >= 0 && newPos <= 51 && !LUDO_SAFE_ZONES.includes(newPos)) {
            Object.keys(newTokens).forEach(c => {
                if (c !== myColor) {
                    newTokens[c as keyof typeof newTokens].forEach((p, i) => {
                        if (p === newPos) {
                            newTokens[c as keyof typeof newTokens][i] = -1; // Kill
                            extraTurn = true;
                            killMessage = `${myColor} killed ${c}! ⚔️`;
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                    });
                }
            });
        }

        // Check Win
        let winner = state.winner;
        if (newPos === 57) {
            extraTurn = true; // Extra turn for reaching home
            if (newTokens[myColor as keyof typeof newTokens].every(p => p === 57)) {
                winner = myColor;
            }
        }

        let nextTurn = state.turn;
        if (!extraTurn) {
            const order = ['R', 'G', 'Y', 'B'];
            let idx = order.indexOf(state.turn);
            do {
                idx = (idx + 1) % 4;
            } while (!state.players[order[idx]] && idx !== order.indexOf(state.turn));
            nextTurn = order[idx] as any;
        }

        const newState: LudoState = {
            ...state,
            tokens: newTokens,
            turn: nextTurn,
            diceValue: null,
            winner,
            message: killMessage || state.message
        };

        await saveState(newState);
    };

    // ----- UI RENDER HELPERS -----
    const getPosCoords = (color: string, pos: number, tokenIndex: number) => {
        if (pos === -1) return LUDO_BASE_POSITIONS[color][tokenIndex];
        if (pos === 57) return LUDO_FINISH_POS[color];
        if (pos >= 52 && pos <= 56) return LUDO_HOME_PATHS[color][pos - 52];
        return LUDO_MAIN_PATH[pos];
    };

    const renderBoardGrid = () => {
        const squares = [];
        for (let r = 0; r < 15; r++) {
            for (let c = 0; c < 15; c++) {
                // Determine square colors
                let bgColor = '#F8FAFC';
                
                // Bases
                if (r < 6 && c < 6) bgColor = '#FEE2E2'; // Red Base
                if (r < 6 && c > 8) bgColor = '#D1FAE5'; // Green Base
                if (r > 8 && c > 8) bgColor = '#FEF3C7'; // Yellow Base
                if (r > 8 && c < 6) bgColor = '#DBEAFE'; // Blue Base
                
                // Home paths
                if (r === 7 && c >= 1 && c <= 5) bgColor = LUDO_COLORS.R;
                if (c === 7 && r >= 1 && r <= 5) bgColor = LUDO_COLORS.G;
                if (r === 7 && c >= 9 && c <= 13) bgColor = LUDO_COLORS.Y;
                if (c === 7 && r >= 9 && r <= 13) bgColor = LUDO_COLORS.B;
                
                // Safe Zones
                const isSafe = LUDO_SAFE_ZONES.some(zone => {
                    const [zc, zr] = LUDO_MAIN_PATH[zone];
                    return zr === r && zc === c;
                });
                
                if (isSafe && bgColor === '#F8FAFC') bgColor = '#E2E8F0';

                // Center
                if (r >= 6 && r <= 8 && c >= 6 && c <= 8) bgColor = '#1E293B';

                squares.push(
                    <View key={`${r}-${c}`} style={[styles.cell, { backgroundColor: bgColor, borderWidth: 0.5, borderColor: '#CBD5E1' }]}>
                        {isSafe && <Ionicons name="star" size={10} color="#94A3B8" />}
                    </View>
                );
            }
        }
        return squares;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Ludo 🎲</Text>
                {state.message && <Text style={styles.alertText}>{state.message}</Text>}
            </View>

            <View style={styles.board}>
                <View style={styles.gridContainer}>
                    {renderBoardGrid()}
                </View>

                {/* Tokens overlay */}
                {['R', 'G', 'Y', 'B'].map((color) => 
                    state.tokens[color as keyof typeof state.tokens]?.map((pos, i) => {
                        const [col, row] = getPosCoords(color, pos, i);
                        const isSelectable = mustMove && color === myColor && validMoves.includes(i);
                        return (
                            <TouchableOpacity
                                key={`${color}-${i}`}
                                style={[
                                    styles.token,
                                    { left: col * CELL_SIZE, top: row * CELL_SIZE },
                                    { backgroundColor: LUDO_COLORS[color as keyof typeof LUDO_COLORS] },
                                    isSelectable && styles.selectableToken
                                ]}
                                onPress={() => isSelectable ? moveToken(i) : null}
                                activeOpacity={isSelectable ? 0.7 : 1}
                            >
                                <View style={styles.tokenInner} />
                            </TouchableOpacity>
                        );
                    })
                )}

                {updating && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator color="#1F2937" size="large" />
                    </View>
                )}
            </View>

            {state.winner ? (
                <Text style={styles.winnerText}>🏆 {state.winner} Won!</Text>
            ) : (
                <View style={styles.controls}>
                    <Text style={[styles.turnText, { color: LUDO_COLORS[state.turn] }]}>
                        {isMyTurn ? "Your Turn!" : `${state.turn}'s Turn`}
                    </Text>
                    <TouchableOpacity 
                        style={[styles.dice, { opacity: canRoll ? 1 : 0.5 }]} 
                        onPress={rollDice}
                        disabled={!canRoll || updating}
                    >
                        <FontAwesome5 
                            name={`dice-${['one','two','three','four','five','six'][(state.diceValue || 1) - 1]}`} 
                            size={32} 
                            color={LUDO_COLORS[state.turn]} 
                        />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 300,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 12,
        alignSelf: 'center',
        marginVertical: 4,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        alignItems: 'center',
    },
    title: { fontWeight: 'bold', fontSize: 16, color: '#1E293B' },
    alertText: { fontSize: 12, color: '#EF4444', fontWeight: 'bold' },
    board: {
        width: BOARD_SIZE,
        height: BOARD_SIZE,
        alignSelf: 'center',
        position: 'relative',
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#475569',
        borderRadius: 4,
        overflow: 'hidden',
    },
    gridContainer: {
        width: BOARD_SIZE,
        height: BOARD_SIZE,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    cell: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    token: {
        position: 'absolute',
        width: CELL_SIZE * 0.7,
        height: CELL_SIZE * 0.7,
        margin: CELL_SIZE * 0.15,
        borderRadius: CELL_SIZE,
        borderWidth: 1.5,
        borderColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
    },
    tokenInner: {
        width: '40%', height: '40%',
        backgroundColor: 'rgba(255,255,255,0.4)',
        borderRadius: 10,
    },
    selectableToken: {
        borderWidth: 2,
        borderColor: '#FDE047',
        transform: [{ scale: 1.2 }],
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingHorizontal: 8,
    },
    turnText: { fontWeight: 'bold', fontSize: 15 },
    dice: {
        width: 48, height: 48,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        borderWidth: 1, borderColor: '#E2E8F0',
    },
    winnerText: {
        marginTop: 12, textAlign: 'center',
        fontSize: 18, fontWeight: 'bold', color: '#10B981'
    }
});
