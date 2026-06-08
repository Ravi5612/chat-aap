import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFriendsStore } from '@/store/useFriendsStore';

interface Props {
    onClose: () => void;
}

const NinjaVaultHeader: React.FC<Props> = ({ onClose }) => {
    return (
        <View style={{ 
            backgroundColor: '#111827', 
            padding: 16, 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: 8, 
            borderRadius: 16, 
            marginHorizontal: 16, 
            marginTop: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)'
        }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Ionicons name="eye-off" size={20} color="#FBBF24" />
                </View>
                <View>
                    <Text style={{ color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 }}>Ninja Vault</Text>
                    <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2, fontWeight: '600' }}>Unlocked & Visible</Text>
                </View>
            </View>
            <TouchableOpacity 
                onPress={() => {
                    useFriendsStore.getState().setVaultOpen(false);
                    onClose();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }} 
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
                <Text style={{ color: '#F87171', fontSize: 13, fontWeight: 'bold' }}>Lock</Text>
            </TouchableOpacity>
        </View>
    );
};

export default NinjaVaultHeader;
