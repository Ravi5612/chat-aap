import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, FlatList, Image, StyleSheet, ActivityIndicator, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';

interface MusicPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelectMusic: (music: { url: string, title: string, artist: string, cover: string }) => void;
}

export default function MusicPicker({ visible, onClose, onSelectMusic }: MusicPickerProps) {
    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Audio Player State
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [playingUrl, setPlayingUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Stop audio when component unmounts or modal closes
    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    useEffect(() => {
        if (!visible && sound) {
            sound.stopAsync();
            setPlayingUrl(null);
            setIsPlaying(false);
        }
    }, [visible, sound]);

    const handleSearch = async (text: string) => {
        setSearchQuery(text);
        if (text.length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(text)}&entity=song&limit=20`);
            const data = await response.json();
            
            // Filter out songs that don't have a previewUrl
            const validSongs = data.results.filter((item: any) => item.previewUrl);
            setResults(validSongs);
        } catch (error) {
            console.error("iTunes Search Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const togglePlay = async (url: string) => {
        try {
            if (playingUrl === url) {
                // Pause current
                if (isPlaying) {
                    await sound?.pauseAsync();
                    setIsPlaying(false);
                } else {
                    await sound?.playAsync();
                    setIsPlaying(true);
                }
                return;
            }

            // Play new song
            if (sound) {
                await sound.unloadAsync();
            }

            setPlayingUrl(url);
            setIsPlaying(true);
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: url },
                { shouldPlay: true }
            );
            
            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setIsPlaying(false);
                    setPlayingUrl(null);
                }
            });

            setSound(newSound);
        } catch (error) {
            console.error("Audio Play Error:", error);
            setIsPlaying(false);
            setPlayingUrl(null);
        }
    };

    const handleSelect = (item: any) => {
        if (sound) {
            sound.stopAsync();
        }
        onSelectMusic({
            url: item.previewUrl,
            title: item.trackName,
            artist: item.artistName,
            cover: item.artworkUrl100
        });
        onClose();
    };

    const renderItem = ({ item }: { item: any }) => {
        const isCurrentPlaying = playingUrl === item.previewUrl;
        
        return (
            <View style={styles.songItem}>
                <Image source={{ uri: item.artworkUrl100 }} style={styles.albumArt} />
                <TouchableOpacity style={styles.songInfo} onPress={() => handleSelect(item)}>
                    <Text style={styles.songTitle} numberOfLines={1}>{item.trackName}</Text>
                    <Text style={styles.songArtist} numberOfLines={1}>{item.artistName}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.playButton} 
                    onPress={() => togglePlay(item.previewUrl)}
                >
                    <Ionicons 
                        name={isCurrentPlaying && isPlaying ? "pause" : "play"} 
                        size={20} 
                        color="white" 
                    />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Add Music</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#94A3B8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search for a song..."
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={handleSearch}
                        autoFocus
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <Ionicons name="close-circle" size={20} color="#94A3B8" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Results List */}
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#F68537" />
                    </View>
                ) : (
                    <FlatList
                        data={results}
                        keyExtractor={(item, index) => item.trackId ? item.trackId.toString() : index.toString()}
                        renderItem={renderItem}
                        keyboardShouldPersistTaps="handled"
                        onScrollBeginDrag={() => Keyboard.dismiss()}
                        ListEmptyComponent={() => (
                            <View style={styles.centerContainer}>
                                {searchQuery.length >= 2 ? (
                                    <Text style={styles.emptyText}>No songs found</Text>
                                ) : (
                                    <Text style={styles.emptyText}>Search to find a song</Text>
                                )}
                            </View>
                        )}
                    />
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1E293B' },
    header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', position: 'relative' },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    closeBtn: { position: 'absolute', right: 20, top: 0 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', margin: 20, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
    searchInput: { flex: 1, color: 'white', fontSize: 16, marginLeft: 8 },
    songItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    albumArt: { width: 50, height: 50, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
    songInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
    songTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    songArtist: { color: '#94A3B8', fontSize: 13 },
    playButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F68537', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    emptyText: { color: '#94A3B8', fontSize: 16 }
});
