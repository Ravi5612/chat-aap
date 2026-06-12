import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { Chess, Square, Move } from 'chess.js';

interface ChessState {
    fen: string;
    playerWhite: string;
    playerBlack: string;
    winner: 'w' | 'b' | 'draw' | null;
}

interface ChessWidgetProps {
    message: any;
    currentUserId: string;
}

export default function ChessWidget({ message, currentUserId }: ChessWidgetProps) {
    const [updating, setUpdating] = useState(false);
    const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
    const [validMoves, setValidMoves] = useState<Move[]>([]);

    let gameState: ChessState;
    try {
        gameState = JSON.parse(message.message);
    } catch (e) {
        return <Text style={{ color: 'red' }}>Corrupted Game Data</Text>;
    }

    const { fen, playerWhite, playerBlack, winner } = gameState;
    
    // Initialize chess engine with current FEN
    const chess = useMemo(() => new Chess(fen), [fen]);
    const board = chess.board(); // 8x8 array

    const isWhite = playerWhite === currentUserId;
    const isBlack = playerBlack === currentUserId;
    const isMyTurn = (chess.turn() === 'w' && isWhite) || (chess.turn() === 'b' && isBlack);
    const myColor = isWhite ? 'w' : 'b';

    const handleSquarePress = async (rowIndex: number, colIndex: number) => {
        if (updating || winner || !isMyTurn) return;

        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
        const square = (files[colIndex] + ranks[rowIndex]) as Square;

        const piece = chess.get(square);

        // If clicking on own piece, select it
        if (piece && piece.color === myColor) {
            Haptics.selectionAsync();
            setSelectedSquare(square);
            setValidMoves(chess.moves({ square, verbose: true }) as Move[]);
            return;
        }

        // If a piece is selected and clicking on a valid target square
        if (selectedSquare) {
            const move = validMoves.find(m => m.to === square);
            if (move) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setUpdating(true);

                try {
                    chess.move({
                        from: selectedSquare,
                        to: square,
                        promotion: 'q' // Auto-promote to queen for simplicity
                    });

                    let newWinner: 'w' | 'b' | 'draw' | null = null;
                    if (chess.isCheckmate()) {
                        newWinner = chess.turn() === 'w' ? 'b' : 'w';
                    } else if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) {
                        newWinner = 'draw';
                    }

                    const newState: ChessState = {
                        ...gameState,
                        fen: chess.fen(),
                        winner: newWinner
                    };

                    const { error } = await supabase
                        .from('messages')
                        .update({ message: JSON.stringify(newState) })
                        .eq('id', message.id);

                    if (error) console.error('Failed to update chess state:', error);
                } catch (e) {
                    console.error('Invalid move', e);
                }

                setSelectedSquare(null);
                setValidMoves([]);
                setUpdating(false);
            } else {
                // Clicked elsewhere, deselect
                setSelectedSquare(null);
                setValidMoves([]);
            }
        }
    };

    const getPieceIcon = (type: string) => {
        switch (type) {
            case 'p': return 'chess-pawn';
            case 'n': return 'chess-knight';
            case 'b': return 'chess-bishop';
            case 'r': return 'chess-rook';
            case 'q': return 'chess-queen';
            case 'k': return 'chess-king';
            default: return 'chess-pawn';
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <FontAwesome5 name="chess" size={16} color="#1F2937" />
                <Text style={styles.title}>Chess</Text>
            </View>

            <View style={styles.statusRow}>
                {winner ? (
                    <Text style={styles.winnerText}>
                        {winner === 'draw' ? 'Game Draw!' : 
                         (winner === myColor ? '🎉 You Won!' : '😔 You Lost!')}
                    </Text>
                ) : (
                    <Text style={[styles.turnText, { color: isMyTurn ? '#10B981' : '#6B7280' }]}>
                        {chess.inCheck() ? '⚠️ CHECK! ' : ''}
                        {isMyTurn ? "Your Turn" : "Opponent's Turn"}
                    </Text>
                )}
            </View>

            <View style={styles.boardContainer}>
                {board.map((row, rowIndex) => (
                    <View key={`row-${rowIndex}`} style={styles.row}>
                        {row.map((piece, colIndex) => {
                            const isLightSquare = (rowIndex + colIndex) % 2 === 0;
                            const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
                            const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
                            const squareId = files[colIndex] + ranks[rowIndex];
                            
                            const isSelected = selectedSquare === squareId;
                            const isValidMove = validMoves.some(m => m.to === squareId);
                            const isCapture = isValidMove && piece;

                            return (
                                <TouchableOpacity
                                    key={squareId}
                                    style={[
                                        styles.square,
                                        { backgroundColor: isLightSquare ? '#F3F4F6' : '#9CA3AF' },
                                        isSelected && styles.selectedSquare,
                                    ]}
                                    onPress={() => handleSquarePress(rowIndex, colIndex)}
                                    activeOpacity={0.8}
                                >
                                    {piece && (
                                        <FontAwesome5 
                                            name={getPieceIcon(piece.type)} 
                                            size={20} 
                                            color={piece.color === 'w' ? '#FFFFFF' : '#000000'}
                                            style={piece.color === 'w' ? styles.whitePieceShadow : null}
                                        />
                                    )}
                                    {isValidMove && !isCapture && <View style={styles.validMoveDot} />}
                                    {isCapture && <View style={styles.captureBorder} />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}
                
                {updating && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator color="#1F2937" size="large" />
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 280,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 12,
        alignSelf: 'center',
        marginVertical: 4,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        gap: 8,
    },
    title: {
        fontWeight: 'bold',
        color: '#1F2937',
        fontSize: 16,
    },
    statusRow: {
        alignItems: 'center',
        marginBottom: 12,
    },
    turnText: {
        fontSize: 13,
        fontWeight: '700',
    },
    winnerText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#EF4444',
    },
    boardContainer: {
        width: 256, // 32 * 8
        height: 256,
        alignSelf: 'center',
        borderWidth: 2,
        borderColor: '#4B5563',
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
    },
    row: {
        flexDirection: 'row',
        height: 32,
    },
    square: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    selectedSquare: {
        backgroundColor: '#FCD34D', // Amber highlight
    },
    whitePieceShadow: {
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    validMoveDot: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    captureBorder: {
        position: 'absolute',
        width: 32,
        height: 32,
        borderWidth: 3,
        borderColor: 'rgba(239, 68, 68, 0.5)', // Red border for captures
        borderRadius: 16,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    }
});
