import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, Modal } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { FlashList } from '@shopify/flash-list';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_MARGIN = 2;
const ITEM_SIZE = (width - (COLUMN_COUNT + 1) * ITEM_MARGIN) / COLUMN_COUNT;

export default function MediaGalleryScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const currentUser = useAuthStore(state => state.user);
    
    const [media, setMedia] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Viewer state
    const [viewerVisible, setViewerVisible] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<any>(null);

    useEffect(() => {
        const fetchMedia = async () => {
            if (!currentUser || !id) return;
            
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .in('message_type', ['image', 'video'])
                .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${currentUser.id})`)
                .order('created_at', { ascending: false });
                
            if (!error && data) {
                setMedia(data);
            }
            setLoading(false);
        };
        fetchMedia();
    }, [id, currentUser]);

    const handleMediaPress = (item: any) => {
        setSelectedMedia(item);
        setViewerVisible(true);
    };

    const renderItem = ({ item }: { item: any }) => {
        const url = item.file_url || (item.message && item.message.split(' ')[1]);
        if (!url) return null;
        
        const isVideo = item.message_type === 'video';

        return (
            <TouchableOpacity 
                activeOpacity={0.8} 
                onPress={() => handleMediaPress({ ...item, url })}
                style={{ margin: ITEM_MARGIN, width: ITEM_SIZE, height: ITEM_SIZE, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}
            >
                <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" />
                {isVideo && (
                    <View style={styles.videoBadge}>
                        <Ionicons name="videocam" size={16} color="white" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Media & Links</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#F68537" />
                </View>
            ) : media.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Ionicons name="images-outline" size={64} color="#CBD5E1" />
                    <Text style={styles.emptyText}>No media shared yet</Text>
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    <FlashList
                        data={media}
                        renderItem={renderItem}
                        estimatedItemSize={ITEM_SIZE}
                        numColumns={COLUMN_COUNT}
                        contentContainerStyle={{ padding: ITEM_MARGIN }}
                    />
                </View>
            )}

            {/* Simple Fullscreen Viewer */}
            <Modal visible={viewerVisible} transparent={true} animationType="fade" onRequestClose={() => setViewerVisible(false)}>
                <View style={styles.viewerContainer}>
                    <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerVisible(false)}>
                        <Ionicons name="close" size={32} color="white" />
                    </TouchableOpacity>
                    {selectedMedia && (
                        <>
                            <Image 
                                source={{ uri: selectedMedia.url }} 
                                style={{ width: '100%', height: '80%' }} 
                                contentFit="contain" 
                            />
                            {selectedMedia.message_type === 'video' && (
                                <View style={styles.videoOverlayPlay}>
                                    <Ionicons name="play-circle" size={64} color="rgba(255,255,255,0.8)" />
                                </View>
                            )}
                        </>
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    backBtn: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#94A3B8',
        fontWeight: '500',
    },
    videoBadge: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
        padding: 4,
    },
    viewerContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewerClose: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 8,
    },
    videoOverlayPlay: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -32 }, { translateY: -32 }],
    }
});
