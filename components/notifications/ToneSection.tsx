import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ToneItem from './ToneItem';

interface ToneSectionProps {
    title: string;
    description: string;
    tones: any[];
    type: 'message' | 'call';
    currentToneUrl: string | undefined;
    playingId: string | null;
    onPlaySound: (id: string, url: string) => void;
    onStopSound: () => void;
    onSaveTone: (type: 'message' | 'call', url: string) => void;
    onUploadTone: (type: 'message' | 'call', oldUrl?: string) => void;
    marginTop?: number;
}

export default function ToneSection({
    title,
    description,
    tones,
    type,
    currentToneUrl,
    playingId,
    onPlaySound,
    onStopSound,
    onSaveTone,
    onUploadTone,
    marginTop = 0
}: ToneSectionProps) {

    // Check if the current tone is custom (not in the default list)
    const isCustomTone = currentToneUrl && !tones.some(t => t.url === currentToneUrl);

    return (
        <View style={[styles.section, { marginTop }]}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionDesc}>{description}</Text>
            
            {tones.map(tone => (
                <ToneItem 
                    key={tone.id}
                    item={tone}
                    type={type}
                    isSelected={currentToneUrl === tone.url}
                    isPlaying={playingId === tone.id}
                    onPlay={() => onPlaySound(tone.id, tone.url)}
                    onStop={onStopSound}
                    onSave={onSaveTone}
                />
            ))}
            
            {isCustomTone && (
                <ToneItem 
                    item={{ id: `custom-${type}`, name: 'Custom Tone', url: currentToneUrl }}
                    type={type}
                    isSelected={true}
                    isPlaying={playingId === `custom-${type}`}
                    onPlay={() => onPlaySound(`custom-${type}`, currentToneUrl)}
                    onStop={onStopSound}
                    onSave={onSaveTone}
                />
            )}
            <TouchableOpacity 
                style={styles.customUploadButton}
                onPress={() => onUploadTone(type, currentToneUrl)}
            >
                <Ionicons name="cloud-upload-outline" size={20} color="#F68537" />
                <Text style={styles.customUploadText}>Choose from Device</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#F68537',
        letterSpacing: 1.2,
        marginBottom: 4,
    },
    sectionDesc: {
        fontSize: 14,
        color: '#9CA3AF',
        marginBottom: 16,
    },
    customUploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: '#FFF9F1',
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#F68537',
        marginTop: 8,
        gap: 10,
    },
    customUploadText: {
        color: '#F68537',
        fontWeight: 'bold',
        fontSize: 14,
    }
});
