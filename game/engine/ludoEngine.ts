import { LUDO_START_INDEX, LUDO_SAFE_ZONES } from '@/utils/ludoConstants';

export interface LudoState {
    players: Record<string, string>; 
    hostColors?: string[];
    opponentColors?: string[];
    turn: string; // 'R' | 'G' | 'Y' | 'B'
    diceValue: number | null;
    tokens: Record<string, number[]>;
    winner: string | null;
    message?: string;
    status?: string;
    lastMoveAt?: number;
    timeoutWinner?: string;
    rules?: {
        tokensCount: number;
        blockRule: boolean;
        tripleSixPenalty: boolean;
        captureBonus: boolean;
    };
    consecutiveSixes?: number;
}

export const getStepsTaken = (color: string, pos: number) => {
    if (pos === -1) return -1;
    if (pos >= 52) return pos - 52 + 51; 
    const start = LUDO_START_INDEX[color];
    return (pos - start + 52) % 52;
};

export const calculateNewPosition = (color: string, currentPos: number, roll: number) => {
    if (currentPos === -1 && roll === 6) {
        return LUDO_START_INDEX[color];
    }
    const stepsTaken = getStepsTaken(color, currentPos);
    if (stepsTaken + roll > 50) {
        return 52 + (stepsTaken + roll - 51);
    }
    return (currentPos + roll) % 52;
};

export const getValidMoves = (state: LudoState, color: string): number[] => {
    if (state.diceValue === null) return [];
    const roll = state.diceValue;
    const validIndices: number[] = [];
    const tokensCount = state.rules?.tokensCount || 4;
    const blockRule = state.rules?.blockRule ?? true;

    const tokens = state.tokens[color];
    if (!tokens) return [];

    tokens.forEach((pos, i) => {
        if (i >= tokensCount) return;
        if (pos === 57) return; 
        
        let newPos = -1;
        if (pos === -1) {
            if (roll === 6) {
                newPos = LUDO_START_INDEX[color];
            }
        } else {
            const stepsTaken = getStepsTaken(color, pos);
            if (stepsTaken + roll <= 56) {
                newPos = calculateNewPosition(color, pos, roll);
            }
        }

        if (newPos !== -1) {
            let isBlocked = false;
            if (blockRule && newPos >= 0 && newPos <= 51) {
                Object.keys(state.tokens).forEach(c => {
                    if (c !== color) {
                        let countOnTile = 0;
                        state.tokens[c].forEach((p, idx) => {
                            if (idx < tokensCount && p === newPos) countOnTile++;
                        });
                        if (countOnTile >= 2) isBlocked = true;
                    }
                });
            }
            if (!isBlocked) {
                if (pos === -1 && roll === 6) validIndices.push(i);
                else if (pos !== -1) validIndices.push(i);
            }
        }
    });
    return validIndices;
};

export const checkKillsAndWin = (state: LudoState, movingColor: string, newPos: number) => {
    const newTokens = JSON.parse(JSON.stringify(state.tokens)) as Record<string, number[]>;
    const tokensCount = state.rules?.tokensCount || 4;
    const captureBonus = state.rules?.captureBonus ?? true;
    
    let extraTurn = state.diceValue === 6;
    let killMessage = '';

    // Check Kill
    if (newPos >= 0 && newPos <= 51 && !LUDO_SAFE_ZONES.includes(newPos)) {
        Object.keys(newTokens).forEach(c => {
            if (c !== movingColor) {
                let countOnTile = 0;
                newTokens[c].forEach((p, idx) => {
                    if (idx < tokensCount && p === newPos) countOnTile++;
                });

                if (countOnTile > 0 && (!state.rules?.blockRule || countOnTile < 2)) {
                    newTokens[c].forEach((p, i) => {
                        if (i < tokensCount && p === newPos) {
                            newTokens[c][i] = -1; // Kill
                            if (captureBonus) extraTurn = true;
                            killMessage = `${movingColor} killed ${c}! ⚔️`;
                        }
                    });
                }
            }
        });
    }

    // Check Win (All active tokens home)
    let winner = state.winner;
    if (newPos === 57) {
        extraTurn = true; 
        let allHome = true;
        for (let i = 0; i < tokensCount; i++) {
            if (newTokens[movingColor][i] !== 57) allHome = false;
        }
        if (allHome) {
            winner = movingColor; 
        }
    }

    return { newTokens, extraTurn, killMessage, winner };
};
