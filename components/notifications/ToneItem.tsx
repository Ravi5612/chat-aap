import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ToneItemProps {
    item: { id: string; name: string; url: string };
    type: 'message' | 'call';
    isSelected: boolean;
    isPlaying: boolean;
    onPlay: () => void;
    onStop: () => void;
    onSave: (type: 'message' | 'call', url: string) => void;
}

export default function ToneItem({ item, type, isSelected, isPlaying, onPlay, onStop, onSave }: ToneItemProps) {
    return (
        <View style={[styles.toneItem, isSelected && styles.selectedTone]}>
            <TouchableOpacity 
                onPress={() => isPlaying ? onStop() : onPlay()}
                style={[styles.playButtonWrapper, isSelected && { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            >
                <Ionicons name={isPlaying ? "stop" : "play"} size={20} color={isSelected ? "white" : "#F68537"} />
            </TouchableOpacity>

            <View style={styles.toneInfo}>
                <Text style={[styles.toneName, isSelected && styles.selectedText]}>{item.name}</Text>
                {isSelected && <Text style={styles.currentLabel}>Active Tone</Text>}
            </View>
            
            <TouchableOpacity 
                onPress={() => onSave(type, item.url)}
                style={[styles.setButton, isSelected ? styles.selectedSetButton : styles.unselectedSetButton]}
            >
                <Text style={[styles.setButtonText, isSelected && { color: '#F68537' }]}>
                    {isSelected ? 'SET' : 'USE'}
                </Text>
                {isSelected && <Ionicons name="checkmark-circle" size={14} color="#F68537" />}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    toneItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    selectedTone: {
        backgroundColor: '#F68537',
        borderColor: '#F68537',
    },
    toneInfo: {
        flex: 1,
    },
    toneName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    selectedText: {
        color: 'white',
    },
    currentLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: 'bold',
        marginTop: 2,
    },
    playButtonWrapper: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFF9F1',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    setButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    selectedSetButton: {
        backgroundColor: 'white',
    },
    unselectedSetButton: {
        backgroundColor: '#FFF9F1',
        borderWidth: 1,
        borderColor: '#F68537',
    },
    setButtonText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#F68537',
    },
});
