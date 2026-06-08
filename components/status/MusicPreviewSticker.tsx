import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface Props {
    selectedMusic: any;
    isMusicPlaying: boolean;
    musicProgress: number;
    musicPosition: number;
    musicDuration: number;
    toggleMusic: () => void;
    onClearMusic: () => void;
}

export const MusicPreviewSticker: React.FC<Props> = ({
    selectedMusic, isMusicPlaying, musicProgress, musicPosition, musicDuration, toggleMusic, onClearMusic
}) => {
    if (!selectedMusic) return null;

    return (
        <>
            {/* Music Progress Bar */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 }}>
                <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.3)', width: '100%' }}>
                    <View style={{ height: '100%', backgroundColor: '#F68537', width: `${musicProgress * 100}%` }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
                    <Text style={{ color: 'white', fontSize: 13, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4, backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                        0:{(Math.floor(musicPosition / 1000)).toString().padStart(2, '0')} / 0:{(Math.floor(musicDuration / 1000)).toString().padStart(2, '0')}
                    </Text>
                </View>
            </View>

            {/* Music Sticker */}
            <View style={styles.musicSticker}>
                <Image source={{ uri: selectedMusic.cover }} style={styles.musicStickerCover} />
                <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text style={styles.musicStickerTitle} numberOfLines={1}>{selectedMusic.title}</Text>
                    <Text style={styles.musicStickerArtist} numberOfLines={1}>{selectedMusic.artist}</Text>
                </View>
                
                <TouchableOpacity onPress={toggleMusic} style={{ padding: 6 }}>
                    <Ionicons name={isMusicPlaying ? "pause-circle" : "play-circle"} size={26} color="white" />
                </TouchableOpacity>

                <TouchableOpacity onPress={onClearMusic} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={20} color="white" />
                </TouchableOpacity>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    musicSticker: { position: 'absolute', top: 50, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 24, padding: 6, flexDirection: 'row', alignItems: 'center', width: 200 },
    musicStickerCover: { width: 40, height: 40, borderRadius: 20 },
    musicStickerTitle: { color: 'white', fontSize: 14, fontWeight: 'bold' },
    musicStickerArtist: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
});
