import { LudoState } from '../engine/ludoEngine';
import { supabase } from '@/lib/supabase';

export const getNextTurn = (currentState: LudoState, extraTurn = false): string => {
    const order = ['R', 'G', 'Y', 'B'];
    let nextTurn = currentState.turn;
    
    if (!extraTurn) {
        let idx = order.indexOf(currentState.turn);
        do {
            idx = (idx + 1) % 4;
        } while (!currentState.players[order[idx]] && idx !== order.indexOf(currentState.turn));
        nextTurn = order[idx];
    }
    return nextTurn;
};

export const saveLudoState = async (messageId: string, newState: LudoState, setUpdating: (v: boolean) => void) => {
    setUpdating(true);
    const stateToSave = { ...newState, lastMoveAt: Date.now() };
    await supabase.from('messages').update({ message: JSON.stringify(stateToSave) }).eq('id', messageId);
    setUpdating(false);
};
