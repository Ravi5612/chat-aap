import { create } from 'zustand';

interface CallSession {
    status: 'incoming' | 'outgoing' | 'ringing' | 'active' | 'ended' | null;
    type: 'audio' | 'video';
    friend: any;
    offer?: any;
    isGroup?: boolean;
    endReason?: string;
}

interface CallState {
    callSession: CallSession | null;
    activeStartTime: number | null;
    setCallSession: (session: CallSession | null) => void;
    setCallRinging: () => void;
    setCallActive: () => void;
    setCallEnded: (reason: string) => void;
    endCall: () => void;
    setCallType: (type: 'audio' | 'video') => void;
    isMinimized: boolean;
    setMinimized: (minimized: boolean) => void;
}

export const useCallStore = create<CallState>((set) => ({
    callSession: null,
    activeStartTime: null,
    setCallSession: (session) => set({ callSession: session, activeStartTime: null }),
    setCallRinging: () => set((state) => ({
        callSession: state.callSession ? { ...state.callSession, status: 'ringing' } : null
    })),
    setCallActive: () => set((state) => ({
        callSession: state.callSession ? { ...state.callSession, status: 'active' } : null,
        activeStartTime: Date.now()
    })),
    setCallEnded: (reason: string) => set((state) => ({
        callSession: state.callSession ? { ...state.callSession, status: 'ended', endReason: reason } : null,
        isMinimized: false
    })),
    endCall: () => set({ callSession: null, isMinimized: false, activeStartTime: null }),
    setCallType: (type) => set((state) => ({
        callSession: state.callSession ? { ...state.callSession, type } : null
    })),
    isMinimized: false,
    setMinimized: (minimized) => set({ isMinimized: minimized }),
}));
