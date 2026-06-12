export const LUDO_SAFE_ZONES = [0, 8, 13, 21, 26, 34, 39, 47];

// Maps global path index (0-51) to [col, row] in 15x15 grid
export const LUDO_MAIN_PATH = [
    [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], // 0-4
    [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], // 5-10
    [7, 0], [8, 0], // 11-12
    [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], // 13-17
    [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], // 18-23
    [14, 7], [14, 8], // 24-25
    [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], // 26-30
    [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], // 31-36
    [7, 14], [6, 14], // 37-38
    [6, 13], [6, 12], [6, 11], [6, 10], [6, 9], // 39-43
    [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], // 44-49
    [0, 7], [0, 6] // 50-51
];

// Home paths for each color (5 steps each)
export const LUDO_HOME_PATHS: Record<string, number[][]> = {
    R: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
    G: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
    Y: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
    B: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
};

// Base positions for tokens (when they are at -1)
export const LUDO_BASE_POSITIONS: Record<string, number[][]> = {
    R: [[2, 2], [3, 2], [2, 3], [3, 3]],
    G: [[11, 2], [12, 2], [11, 3], [12, 3]],
    Y: [[11, 11], [12, 11], [11, 12], [12, 12]],
    B: [[2, 11], [3, 11], [2, 12], [3, 12]],
};

// Center finish positions
export const LUDO_FINISH_POS: Record<string, number[]> = {
    R: [6, 7], G: [7, 6], Y: [8, 7], B: [7, 8]
};

export const LUDO_START_INDEX: Record<string, number> = {
    R: 0, G: 13, Y: 26, B: 39
};

// The index after which a token enters its home path
export const LUDO_TURN_INDEX: Record<string, number> = {
    R: 50, G: 11, Y: 24, B: 37
};

export const LUDO_COLORS = {
    R: '#EF4444',
    G: '#10B981',
    Y: '#FBBF24',
    B: '#3B82F6',
};
