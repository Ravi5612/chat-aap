import { create } from 'zustand';

interface CallSession {
    status: 'incoming' | 'outgoing' | 'active' | null;
    type: 'audio' | 'video';
    friend: any;
    offer?: any;
}

interface CallState {
    callSession: CallSession | null;
    setCallSession: (session: CallSession | null) => void;
    setCallActive: () => void;
    endCall: () => void;
}

export const useCallStore = create<CallState>((set) => ({
    callSession: null,
    setCallSession: (session) => set({ callSession: session }),
    setCallActive: () => set((state) => ({
        callSession: state.callSession ? { ...state.callSession, status: 'active' } : null
    })),
    endCall: () => set({ callSession: null }),
}));
