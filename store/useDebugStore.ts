import { create } from 'zustand';

interface DebugStore {
    logs: string[];
    addLog: (log: string) => void;
    clearLogs: () => void;
    isVisible: boolean;
    toggleVisible: () => void;
}

export const useDebugStore = create<DebugStore>((set) => ({
    logs: [],
    isVisible: false,
    toggleVisible: () => set((state) => ({ isVisible: !state.isVisible })),
    addLog: (log) => {
        const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
        set((state) => ({ 
            logs: [...state.logs.slice(-199), `[${timestamp}] ${log}`] 
        }));
    },
    clearLogs: () => set({ logs: [] })
}));

// Override console methods to capture logs
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = (...args) => {
    originalLog(...args);
    useDebugStore.getState().addLog(`INFO: ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);
};

console.warn = (...args) => {
    originalWarn(...args);
    useDebugStore.getState().addLog(`WARN: ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);
};

console.error = (...args) => {
    originalError(...args);
    useDebugStore.getState().addLog(`ERROR: ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);
};
