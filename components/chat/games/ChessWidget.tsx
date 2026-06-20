import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { Chess, Square, Move } from 'chess.js';
import GameInviteOverlay from './GameInviteOverlay';

interface ChessState {
    fen: string;
    playerWhite: string;
    playerBlack: string;
    winner: 'w' | 'b' | 'draw' | null;
    status?: string;
    lastMoveAt?: number;
    timeoutWinner?: 'w' | 'b';
    message?: string;
    lastMove?: { from: string, to: string };
}

interface ChessWidgetProps {
    message: any;
    currentUserId: string;
}

export default function ChessWidget({ message, currentUserId }: ChessWidgetProps) {
    const [updating, setUpdating] = useState(false);
    const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
    const [validMoves, setValidMoves] = useState<Move[]>([]);
    const [timeLeft, setTimeLeft] = useState(120);
    const [promotionMove, setPromotionMove] = useState<{from: Square, to: Square} | null>(null);

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

    const [isFlipped, setIsFlipped] = useState(myColor === 'b');

    // Material & Captured Pieces Calculation
    const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let whitePoints = 0;
    let blackPoints = 0;
    const currentPieces = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };

    board.forEach(row => {
        row.forEach(piece => {
            if (piece) {
                if (currentPieces[piece.color as 'w'|'b'][piece.type as 'p'|'n'|'b'|'r'|'q'] !== undefined) {
                    currentPieces[piece.color as 'w'|'b'][piece.type as 'p'|'n'|'b'|'r'|'q']++;
                }
                if (piece.color === 'w') whitePoints += pieceValues[piece.type] || 0;
                else blackPoints += pieceValues[piece.type] || 0;
            }
        });
    });

    const initialPieces: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const capturedByWhite: string[] = [];
    const capturedByBlack: string[] = [];

    ['q', 'r', 'b', 'n', 'p'].forEach(type => {
        const wMissing = initialPieces[type] - currentPieces.w[type as 'p'|'n'|'b'|'r'|'q'];
        const bMissing = initialPieces[type] - currentPieces.b[type as 'p'|'n'|'b'|'r'|'q'];
        for(let i=0; i<Math.max(0, bMissing); i++) capturedByWhite.push(type);
        for(let i=0; i<Math.max(0, wMissing); i++) capturedByBlack.push(type);
    });

    const whiteAdvantage = whitePoints - blackPoints;
    const blackAdvantage = blackPoints - whitePoints;

    const renderCaptured = (captured: string[], adv: number) => {
        if (captured.length === 0 && adv <= 0) return null;
        return (
            <View style={styles.capturedRow}>
                {captured.map((p, i) => (
                    <FontAwesome5 key={i} name={getPieceIcon(p)} size={12} color="#6B7280" style={{ marginRight: 2 }} />
                ))}
                {adv > 0 && <Text style={styles.advText}>+{adv}</Text>}
            </View>
        );
    };

    useEffect(() => {
        if (winner || gameState.status !== 'active' || !gameState.lastMoveAt) return;

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - gameState.lastMoveAt!) / 1000);
            const remaining = Math.max(120 - elapsed, 0);
            setTimeLeft(remaining);

            if (remaining === 0 && !isMyTurn && !winner && !updating) {
                claimTimeoutWin();
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [gameState.lastMoveAt, winner, isMyTurn, gameState.status]);

    const claimTimeoutWin = async () => {
        setUpdating(true);
        const newState: ChessState = {
            ...gameState,
            winner: myColor,
            timeoutWinner: myColor
        };
        await supabase.from('messages').update({ message: JSON.stringify(newState) }).eq('id', message.id);
        setUpdating(false);
    };

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
                // Check for promotion
                if (move.promotion) {
                    setPromotionMove({ from: selectedSquare, to: square });
                    return;
                }

                executeMove(selectedSquare, square, 'q');
            } else {
                setSelectedSquare(null);
                setValidMoves([]);
            }
        }
    };

    const executeMove = async (from: Square, to: Square, promotion: 'q'|'r'|'b'|'n' = 'q') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setUpdating(true);
        setPromotionMove(null);

        try {
            chess.move({ from, to, promotion });

            let newWinner: 'w' | 'b' | 'draw' | null = null;
            if (chess.isCheckmate()) {
                newWinner = chess.turn() === 'w' ? 'b' : 'w';
            } else if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) {
                newWinner = 'draw';
            }

            const newState: ChessState = {
                ...gameState,
                fen: chess.fen(),
                winner: newWinner,
                lastMoveAt: Date.now(),
                lastMove: { from, to }
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
    };

    const handleResign = async () => {
        if (winner) return;
        setUpdating(true);
        const newState: ChessState = {
            ...gameState,
            winner: myColor === 'w' ? 'b' : 'w',
            status: 'resigned',
            message: `${isWhite ? 'White' : 'Black'} resigned.`
        };
        await supabase.from('messages').update({ message: JSON.stringify(newState) }).eq('id', message.id);
        setUpdating(false);
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

    const boardCells = useMemo(() => {
        return (isFlipped ? [...board].reverse() : board).map((row, displayRowIndex) => (
            <View key={`row-${displayRowIndex}`} style={styles.row}>
                {(isFlipped ? [...row].reverse() : row).map((piece, displayColIndex) => {
                    const actualRowIndex = isFlipped ? 7 - displayRowIndex : displayRowIndex;
                    const actualColIndex = isFlipped ? 7 - displayColIndex : displayColIndex;
                    const isLightSquare = (actualRowIndex + actualColIndex) % 2 === 0;
                    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
                    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
                    const squareId = files[actualColIndex] + ranks[actualRowIndex];
                    
                    const isSelected = selectedSquare === squareId;
                    const isValidMove = validMoves.some(m => m.to === squareId);
                    const isCapture = isValidMove && piece;
                    const isLastMove = gameState.lastMove && (gameState.lastMove.from === squareId || gameState.lastMove.to === squareId);

                    return (
                        <TouchableOpacity
                            key={squareId}
                            style={[
                                styles.square,
                                { backgroundColor: isLightSquare ? '#F3F4F6' : '#9CA3AF' },
                                isSelected && styles.selectedSquare,
                                !isSelected && isLastMove && styles.lastMoveSquare,
                            ]}
                            onPress={() => handleSquarePress(actualRowIndex, actualColIndex)}
                            activeOpacity={0.8}
                        >
                            {piece && (
                                <FontAwesome5 
                                    name={getPieceIcon(piece.type)} 
                                    size={20} 
                                    color={piece.color === 'w' ? '#FFFFFF' : '#111827'}
                                    style={piece.color === 'w' ? styles.whitePieceShadow : null}
                                />
                            )}
                            {isValidMove && !isCapture && <View style={styles.validMoveDot} />}
                            {isCapture && <View style={styles.captureBorder} />}
                        </TouchableOpacity>
                    );
                })}
            </View>
        ));
    }, [board, isFlipped, selectedSquare, validMoves, gameState.lastMove]);

    return (
        <GameInviteOverlay gameName="Chess ♟️" gameState={gameState} currentUserId={currentUserId} messageId={message.id}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <FontAwesome5 name="chess" size={16} color="#1F2937" />
                        <Text style={styles.title}>Chess Pro</Text>
                    </View>
                    <TouchableOpacity onPress={() => setIsFlipped(!isFlipped)} style={styles.flipBtn}>
                        <Ionicons name="swap-vertical" size={18} color="#4B5563" />
                    </TouchableOpacity>
                </View>

                {gameState.message && <Text style={styles.alertText}>{gameState.message}</Text>}

                <View style={styles.statusRow}>
                    {winner ? (
                        <Text style={styles.winnerText}>
                            {winner === 'draw' ? 'Game Draw!' : 
                             (gameState.status === 'resigned' ? (winner === myColor ? '🎉 Opponent Resigned!' : '😔 You Resigned') :
                             (gameState.timeoutWinner ? (winner === myColor ? '🎉 You Won (Timeout)!' : '⏳ You Lost (Timeout)') :
                             (winner === myColor ? '🎉 You Won!' : '😔 You Lost!')))}
                        </Text>
                    ) : (
                        <View style={{ alignItems: 'center' }}>
                            <Text style={[styles.turnText, { color: isMyTurn ? '#10B981' : '#F59E0B' }]}>
                                {isMyTurn ? "Your Turn" : "Opponent's Turn"}
                            </Text>
                            {gameState.status === 'active' && gameState.lastMoveAt && (
                                <Text style={styles.timerText}>
                                    {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? '0' : ''}{timeLeft % 60}
                                </Text>
                            )}
                        </View>
                    )}
                </View>

            <View style={styles.boardContainer}>
                {/* Top Opponent Captured */}
                <View style={styles.capturedContainerTop}>
                    {isFlipped ? renderCaptured(capturedByWhite, whiteAdvantage) : renderCaptured(capturedByBlack, blackAdvantage)}
                </View>

                <View style={styles.boardInner}>
                    {boardCells}
                </View>
                
                {/* Bottom Player Captured */}
                <View style={styles.capturedContainerBottom}>
                    {isFlipped ? renderCaptured(capturedByBlack, blackAdvantage) : renderCaptured(capturedByWhite, whiteAdvantage)}
                </View>
                
                {updating && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator color="#1F2937" size="large" />
                    </View>
                )}
            </View>

            {/* Actions Row */}
            {!winner && isMyTurn && (
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.resignBtn} onPress={handleResign}>
                        <Text style={styles.resignBtnText}>Resign</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Promotion Modal */}
            {promotionMove && (
                <Modal transparent visible animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.promotionCard}>
                            <Text style={styles.promotionTitle}>Promote Pawn</Text>
                            <View style={styles.promotionRow}>
                                {(['q', 'r', 'b', 'n'] as const).map(type => (
                                    <TouchableOpacity 
                                        key={type} 
                                        style={styles.promotionBtn} 
                                        onPress={() => executeMove(promotionMove.from, promotionMove.to, type)}
                                    >
                                        <FontAwesome5 
                                            name={getPieceIcon(type)} 
                                            size={32} 
                                            color={myColor === 'w' ? '#FFFFFF' : '#111827'}
                                            style={myColor === 'w' ? styles.whitePieceShadow : null}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setPromotionMove(null)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
        </GameInviteOverlay>
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
        fontSize: 16,
        fontWeight: 'bold',
        color: '#EF4444',
    },
    boardContainer: {
        width: 256,
        alignSelf: 'center',
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
    },
    flipBtn: { padding: 4, backgroundColor: '#F1F5F9', borderRadius: 8 },
    alertText: { fontSize: 12, color: '#EF4444', fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
    capturedContainerTop: { paddingBottom: 4, paddingHorizontal: 4, minHeight: 20 },
    capturedContainerBottom: { paddingTop: 4, paddingHorizontal: 4, minHeight: 20 },
    capturedRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    advText: { fontSize: 10, fontWeight: 'bold', color: '#10B981', marginLeft: 4 },
    boardInner: { borderWidth: 2, borderColor: '#4B5563', borderRadius: 4, overflow: 'hidden' },
    lastMoveSquare: { backgroundColor: 'rgba(253, 224, 71, 0.4)' },
    actionsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
    resignBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#FEE2E2', borderRadius: 8, borderWidth: 1, borderColor: '#FCA5A5' },
    resignBtnText: { color: '#EF4444', fontWeight: 'bold', fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    promotionCard: { backgroundColor: 'white', padding: 24, borderRadius: 16, alignItems: 'center', elevation: 10 },
    promotionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 16 },
    promotionRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
    promotionBtn: { width: 48, height: 48, backgroundColor: '#F3F4F6', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
    cancelBtn: { paddingVertical: 8, paddingHorizontal: 24, backgroundColor: '#F3F4F6', borderRadius: 8 },
    cancelBtnText: { color: '#4B5563', fontWeight: 'bold' }
});
