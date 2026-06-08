import { create } from 'zustand';

export interface EmergencyData {
    id: string;
    user_id: string;
    latitude: number;
    longitude: number;
    share_phone: boolean;
    share_email: boolean;
    created_at: string;
    victim_name?: string;
    victim_phone?: string;
    victim_email?: string;
    distance_km?: number;
}

interface EmergencyState {
    activeEmergency: EmergencyData | null;
    isVibrating: boolean;
    setActiveEmergency: (emergency: EmergencyData | null) => void;
    stopVibration: () => void;
}

export const useEmergencyStore = create<EmergencyState>((set) => ({
    activeEmergency: null,
    isVibrating: false,
    setActiveEmergency: (emergency) => set({ activeEmergency: emergency, isVibrating: !!emergency }),
    stopVibration: () => set({ isVibrating: false })
}));
