import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import GameInviteOverlay from './GameInviteOverlay';

interface TicTacToeState {
    board: (string | null)[];
    turn: 'X' | 'O';
    playerX: string;
    playerO: string;
    winner: string | null | 'Draw';
    status?: string;
    lastMoveAt?: number;
    timeoutWinner?: string;
    historyX?: number[];
    historyO?: number[];
    config?: {
        mode: 'classic' | 'infinite';
        timer: 0 | 5 | 10;
    };
}

interface TicTacToeWidgetProps {
    message: any;
    currentUserId: string;
    onStartCall?: (type: 'audio' | 'video') => void;
}

export default function TicTacToeWidget({ message, currentUserId, onStartCall }: TicTacToeWidgetProps) {
    const [updating, setUpdating] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [optimisticState, setOptimisticState] = useState<TicTacToeState | null>(null);

    let serverState: TicTacToeState;
    try {
        serverState = JSON.parse(message.message);
    } catch (e) {
        return <Text style={{ color: 'red' }}>Corrupted Game Data</Text>;
    }

    // Clear optimistic state if server catches up
    useEffect(() => {
        if (optimisticState && serverState.lastMoveAt && optimisticState.lastMoveAt && serverState.lastMoveAt >= optimisticState.lastMoveAt) {
            setOptimisticState(null);
        }
    }, [serverState.lastMoveAt, optimisticState]);

    const gameState = optimisticState || serverState;
    const { board, turn, playerX, playerO, winner, config, historyX = [], historyO = [] } = gameState;
    const isMyTurn = (turn === 'X' && playerX === currentUserId) || (turn === 'O' && playerO === currentUserId);
    const iAmPlayerX = playerX === currentUserId;
    const mySymbol = iAmPlayerX ? 'X' : 'O';
    
    const isInfinite = config?.mode === 'infinite';
    const timerLimit = config?.timer || 0;

    useEffect(() => {
        if (winner || gameState.status !== 'active' || !gameState.lastMoveAt || timerLimit === 0) return;

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - gameState.lastMoveAt!) / 1000);
            const remaining = Math.max(timerLimit - elapsed, 0);
            setTimeLeft(remaining);

            if (remaining === 0 && !isMyTurn && !winner && !updating) {
                // Opponent ran out of time, I win!
                claimTimeoutWin();
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [gameState.lastMoveAt, winner, isMyTurn, gameState.status, updating, timerLimit]);

    const claimTimeoutWin = async () => {
        setUpdating(true);
        const newState: TicTacToeState = {
            ...gameState,
            winner: mySymbol,
            timeoutWinner: mySymbol
        };
        setOptimisticState(newState);
        await supabase.from('messages').update({ message: JSON.stringify(newState) }).eq('id', message.id);
        setUpdating(false);
    };

    const checkWinner = (newBoard: (string | null)[]) => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
            [0, 4, 8], [2, 4, 6] // diagonals
        ];
        for (let i = 0; i < lines.length; i++) {
            const [a, b, c] = lines[i];
            if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
                return newBoard[a]; // 'X' or 'O'
            }
        }
        if (!newBoard.includes(null)) return 'Draw';
        return null;
    };

    const handleCellPress = async (index: number) => {
        if (updating || winner || board[index] || !isMyTurn) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setUpdating(true);

        const newBoard = [...board];
        newBoard[index] = turn;
        
        let newHistoryX = [...historyX];
        let newHistoryO = [...historyO];

        if (isInfinite) {
            if (turn === 'X') {
                newHistoryX.push(index);
                if (newHistoryX.length > 3) {
                    const oldest = newHistoryX.shift();
                    if (oldest !== undefined) newBoard[oldest] = null;
                }
            } else {
                newHistoryO.push(index);
                if (newHistoryO.length > 3) {
                    const oldest = newHistoryO.shift();
                    if (oldest !== undefined) newBoard[oldest] = null;
                }
            }
        }
        
        const newWinner = checkWinner(newBoard);
        const newTurn = turn === 'X' ? 'O' : 'X';

        const newState: TicTacToeState = {
            ...gameState,
            board: newBoard,
            turn: newTurn,
            winner: newWinner,
            lastMoveAt: Date.now(),
            historyX: newHistoryX,
            historyO: newHistoryO
        };

        setOptimisticState(newState);

        const { error } = await supabase
            .from('messages')
            .update({ message: JSON.stringify(newState) })
            .eq('id', message.id);

        if (error) {
            console.error('Failed to update game state:', error);
            setOptimisticState(null); // Revert on failure
        }
        setUpdating(false);
    };

    const boardCells = useMemo(() => {
        return board.map((cell, index) => {
            let isFading = false;
            if (isInfinite) {
                if (cell === 'X' && historyX.length === 3 && historyX[0] === index) isFading = true;
                if (cell === 'O' && historyO.length === 3 && historyO[0] === index) isFading = true;
            }

            return (
                <TouchableOpacity
                    key={index}
                    style={[
                        styles.cell,
                        index % 3 !== 2 && styles.borderRight,
                        index < 6 && styles.borderBottom
                    ]}
                    onPress={() => handleCellPress(index)}
                    disabled={!!cell || !!winner || !isMyTurn || updating}
                    activeOpacity={0.6}
                >
                    <Text style={[
                        styles.cellText,
                        { color: cell === 'X' ? '#F68537' : '#3B82F6' },
                        isFading && { opacity: 0.3 }
                    ]}>
                        {cell}
                    </Text>
                </TouchableOpacity>
            );
        });
    }, [board, isInfinite, historyX, historyO, winner, isMyTurn, updating]);

    return (
        <GameInviteOverlay gameName="Tic-Tac-Toe" gameState={gameState} currentUserId={currentUserId} messageId={message.id}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Ionicons name="game-controller" size={16} color="#F68537" />
                    <Text style={styles.title}>Tic-Tac-Toe</Text>
                </View>

                <View style={styles.statusRow}>
                    {winner ? (
                        <Text style={styles.winnerText}>
                            {winner === 'Draw' ? 'Game Draw!' : 
                             (gameState.timeoutWinner ? (winner === mySymbol ? '🎉 You Won (Timeout)!' : '⏳ You Lost (Timeout)') :
                             (winner === mySymbol ? '🎉 You Won!' : '😔 You Lost!'))}
                        </Text>
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 10 }}>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={[styles.turnText, { color: isMyTurn ? '#10B981' : '#F59E0B' }]}>
                                    {isMyTurn ? "Your Turn" : "Opponent's Turn"}
                                </Text>
                                {gameState.status === 'active' && gameState.lastMoveAt && timerLimit > 0 && (
                                    <Text style={styles.timerText}>
                                        {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? '0' : ''}{timeLeft % 60}
                                    </Text>
                                )}
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity onPress={() => onStartCall?.('audio')} style={styles.callBtn}>
                                    <Ionicons name="mic" size={18} color="#3B82F6" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => onStartCall?.('video')} style={styles.callBtn}>
                                    <Ionicons name="videocam" size={18} color="#10B981" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                <View style={styles.board}>
                    {boardCells}
                </View>
            </View>
        </GameInviteOverlay>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 220,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 12,
        alignSelf: 'center',
        marginVertical: 4,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        gap: 6,
    },
    title: {
        fontWeight: 'bold',
        color: '#1F2937',
        fontSize: 14,
    },
    statusRow: {
        alignItems: 'center',
        marginBottom: 12,
    },
    turnText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    timerText: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: 'bold',
        fontVariant: ['tabular-nums'],
    },
    winnerText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#EF4444',
    },
    board: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: 180,
        height: 180,
        alignSelf: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    cell: {
        width: '33.33%',
        height: '33.33%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    borderRight: {
        borderRightWidth: 2,
        borderRightColor: '#E2E8F0',
    },
    borderBottom: {
        borderBottomWidth: 2,
        borderBottomColor: '#E2E8F0',
    },
    cellText: {
        fontSize: 32,
        fontWeight: '900',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    callBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }
});
