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
}

export const getStepsTaken = (color: string, pos: number) => {
    if (pos === -1) return -1;
    if (pos >= 52) return pos - 52 + 51; 
    const start = LUDO_START_INDEX[color];
    return (pos - start + 52) % 52;
};

export const getValidMoves = (state: LudoState, color: string): number[] => {
    if (state.diceValue === null) return [];
    const roll = state.diceValue;
    const validIndices: number[] = [];

    const tokens = state.tokens[color];
    if (!tokens) return [];

    tokens.forEach((pos, i) => {
        if (pos === 57) return; 
        if (pos === -1) {
            if (roll === 6) validIndices.push(i);
        } else {
            const stepsTaken = getStepsTaken(color, pos);
            if (stepsTaken + roll <= 56) {
                validIndices.push(i);
            }
        }
    });
    return validIndices;
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

export const checkKillsAndWin = (state: LudoState, movingColor: string, newPos: number) => {
    const newTokens = JSON.parse(JSON.stringify(state.tokens)) as Record<string, number[]>;
    let extraTurn = state.diceValue === 6;
    let killMessage = '';

    // Check Kill
    if (newPos >= 0 && newPos <= 51 && !LUDO_SAFE_ZONES.includes(newPos)) {
        Object.keys(newTokens).forEach(c => {
            if (c !== movingColor) {
                newTokens[c].forEach((p, i) => {
                    if (p === newPos) {
                        newTokens[c][i] = -1; // Kill
                        extraTurn = true;
                        killMessage = `${movingColor} killed ${c}! ⚔️`;
                    }
                });
            }
        });
    }

    // Check Win (All 4 tokens home)
    let winner = state.winner;
    if (newPos === 57) {
        extraTurn = true; 
        if (newTokens[movingColor].every(p => p === 57)) {
            // Did the team win? 
            // We just check if all colors owned by the same player are home, or just this color?
            // To keep it simple, if one of your colors gets all 4 home, you win the match.
            winner = movingColor; 
        }
    }

    return { newTokens, extraTurn, killMessage, winner };
};
