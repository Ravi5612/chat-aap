import React, { useRef, useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Dimensions, Text, TouchableOpacity, View, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { Audio } from 'expo-av';
import { useRouter as useExpoRouter } from 'expo-router';

// Hooks
import { useStatusFetcher } from '@/hooks/useStatusFetcher';
import { useStatusViewers } from '@/hooks/useStatusViewers';
import { useStatusControls } from '@/hooks/useStatusControls';
import { useMessageMediaCache } from '@/hooks/useMessageMediaCache';

// Components
import StatusRenderer from '@/components/status/StatusRenderer';
import StatusOverlay from '@/components/status/StatusOverlay';

const { width, height } = Dimensions.get('window');

export default function StatusViewer() {
    const { userId, initialIndex, isArchive, date, statusId } = useLocalSearchParams();
    const router = useExpoRouter();
    const insets = useSafeAreaInsets();
    
    const viewerVideoRef = useRef<any>(null);
    const [currentIndex, setCurrentIndex] = useState(parseInt(initialIndex as string || '0'));
    const [replyText, setReplyText] = useState('');
    const [showViewers, setShowViewers] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const toastAnim = useRef(new Animated.Value(0)).current;
    
    // Background Music
    const [bgMusic, setBgMusic] = useState<Audio.Sound | null>(null);

    // 1. Fetcher Hook
    const { statuses, setStatuses, loading, currentUser } = useStatusFetcher(userId as string, isArchive as string, date as string);

    // If statusId is provided, jump to it once statuses load
    useEffect(() => {
        if (!loading && statuses.length > 0 && statusId) {
            const idx = statuses.findIndex(s => s.id === statusId);
            if (idx !== -1 && idx !== currentIndex) {
                setCurrentIndex(idx);
            }
        }
    }, [loading, statuses, statusId]);

    const currentStatusUI = statuses[currentIndex];
    const isOwner = !!(currentUser && userId === currentUser.id);

    // 1.5 Get Status Key
    const [statusKey, setStatusKey] = useState<Uint8Array | null>(null);
    useEffect(() => {
        if (userId) {
            import('@/utils/chatCrypto').then(({ getChatKey }) => {
                getChatKey(userId as string, userId as string).then(setStatusKey);
            });
        }
    }, [userId]);

    const { localImageUrl, localVoiceUrl, imageLoading } = useMessageMediaCache(
        currentStatusUI || {},
        currentStatusUI?.media_type !== 'text' ? currentStatusUI?.media_url : null,
        currentStatusUI?.audio_url || null,
        null,
        statusKey
    );

    const renderedStatusUI = currentStatusUI ? {
        ...currentStatusUI,
        media_url: localImageUrl || currentStatusUI.media_url,
        audio_url: localVoiceUrl ? JSON.stringify({ ...JSON.parse(currentStatusUI.audio_url || '{}'), url: localVoiceUrl }) : currentStatusUI.audio_url
    } : null;

    // 2. Viewers Hook
    const { statusViewers } = useStatusViewers(renderedStatusUI, currentUser, isOwner);

    // 3. Controls Hook
    const { paused, setPaused, progress, setProgress, isReplying, setIsReplying, touchStartRef, handleNext, handlePrev } = useStatusControls(
        statuses, currentIndex, setCurrentIndex, loading, userId as string, router, currentUser
    );

    // Toast
    const showToast = (message: string) => {
        setToastMessage(message);
        Animated.sequence([
            Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.delay(2000),
            Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true })
        ]).start(() => setToastMessage(''));
    };

    // Video Play/Pause effect
    useEffect(() => {
        if (statuses[currentIndex]?.media_type === 'video' && viewerVideoRef.current) {
            if (paused) viewerVideoRef.current.pauseAsync();
            else viewerVideoRef.current.playAsync();
        }
    }, [paused, currentIndex, statuses]);

    // Handle Music playback
    useEffect(() => {
        let sound: Audio.Sound | null = null;
        
        const playMusic = async () => {
            if (bgMusic) {
                await bgMusic.unloadAsync();
                setBgMusic(null);
            }
            if (currentStatusUI?.audio_url) {
                try {
                    const musicData = JSON.parse(currentStatusUI.audio_url);
                    if (musicData?.url) {
                        const { sound: newSound } = await Audio.Sound.createAsync(
                            { uri: musicData.url },
                            { shouldPlay: !paused, isLooping: true }
                        );
                        sound = newSound;
                        setBgMusic(newSound);
                    }
                } catch(e) {}
            }
        };
        
        if (currentStatusUI) {
            playMusic();
        }

        return () => {
            if (sound) {
                sound.unloadAsync().catch(() => {});
            }
        };
    }, [currentIndex, statuses, currentStatusUI?.id]);

    useEffect(() => {
        if (bgMusic) {
            if (paused) bgMusic.pauseAsync();
            else bgMusic.playAsync();
        }
    }, [paused, bgMusic]);

    const handleSendReply = async () => {
        if (!replyText.trim() || !currentUser || !currentStatusUI) return;
        try {
            const { getChatKey, encryptText } = await import('@/utils/chatCrypto');
            const chatKey = await getChatKey(currentUser.id, userId as string);
            if (!chatKey) throw new Error("Encryption key not found");

            const encryptedReply = await encryptText(replyText.trim(), chatKey);
            const { useDbStore } = await import('@/store/useDbStore');
            const { saveLocalMessage } = await import('@/lib/localDb');
            const { db } = useDbStore.getState();
            
            const tempId = `temp-${Date.now()}`;
            const tempMsg: any = {
                id: tempId, sender_id: currentUser.id, receiver_id: userId,
                message: replyText.trim(), message_type: 'text', status: 'pending',
                is_read: false, status_id: currentStatusUI.id, created_at: new Date().toISOString()
            };

            if (db) saveLocalMessage(db, tempMsg);

            const { data, error } = await supabase.from('messages').insert([{
                sender_id: currentUser.id, receiver_id: userId, message: encryptedReply,
                message_type: 'text', status: 'sent', is_read: false, status_id: currentStatusUI.id
            }]).select().single();

            if (error) throw error;

            if (db && data) {
                try { await db.runAsync('DELETE FROM messages WHERE id = ?', [tempId]); } catch (e) {}
                saveLocalMessage(db, { ...data, message: replyText.trim() });
            }

            setReplyText('');
            showToast('Your reply has been sent! 🚀');
        } catch (error: any) {
            console.error('Error sending status reply:', error);
            Alert.alert('Error', 'Failed to send encrypted reply');
        }
    };

    const handleDeleteStatus = async () => {
        if (!currentStatusUI || !isOwner) return;
        Alert.alert('Delete Status', 'Are you sure you want to delete this status update?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        if (currentStatusUI.storage_paths && Array.isArray(currentStatusUI.storage_paths)) {
                            // Statuses are now on Cloudinary, no need to delete from Supabase storage
                        }
                        const { error } = await supabase.from('statuses').delete().eq('id', currentStatusUI.id);
                        if (error) throw error;
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        const updatedStatuses = statuses.filter(s => s.id !== currentStatusUI.id);
                        if (updatedStatuses.length === 0) router.back();
                        else {
                            setStatuses(updatedStatuses);
                            if (currentIndex >= updatedStatuses.length) setCurrentIndex(updatedStatuses.length - 1);
                        }
                    } catch (error: any) {
                        Alert.alert('Error', error.message || 'Failed to delete status');
                    }
                }
            }
        ]);
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#F68537" />
                <Text style={{ color: 'white', marginTop: 16 }}>Loading Story...</Text>
            </View>
        );
    }

    if (statuses.length === 0) {
        return (
            <View style={{ flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <Text style={{ color: 'white', marginBottom: 20, fontSize: 16, textAlign: 'center' }}>
                    {isArchive === 'true' ? `No status updates found for ${date || 'this period'}.` : 'No active statuses found.'}
                </Text>
                <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: '#F68537', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    let trimStart = 0;
    let trimEnd = 999999;
    if (renderedStatusUI?.media_url) {
        const url = renderedStatusUI.media_url;
        const matchStart = url.match(/trim_start=(\d+)/);
        const matchEnd = url.match(/trim_end=(\d+)/);
        if (matchStart) trimStart = parseInt(matchStart[1]);
        if (matchEnd) trimEnd = parseInt(matchEnd[1]);
    }

    const onViewerPlaybackStatusUpdate = (status: any) => {
        if (!status.isLoaded) return;
        if (status.isPlaying) {
            if (status.positionMillis < trimStart * 1000 || status.positionMillis >= trimEnd * 1000) {
                viewerVideoRef.current?.setStatusAsync({ positionMillis: trimStart * 1000 });
            }
        }
        if (statuses[currentIndex]?.media_type === 'video' && !paused) {
            const totalDuration = status.durationMillis || 10000;
            const position = status.positionMillis || 0;
            setProgress(Math.min(1, position / totalDuration));
            if (status.didJustFinish) handleNext();
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'black' }}>
            <TouchableOpacity
                activeOpacity={1}
                onPressIn={() => { touchStartRef.current = Date.now(); setPaused(true); }}
                onPressOut={() => setPaused(false)}
                onPress={(e) => {
                    const touchDuration = Date.now() - touchStartRef.current;
                    if (touchDuration < 250) {
                        const x = e.nativeEvent.locationX;
                        if (x < width / 3) handlePrev();
                        else if (x > (2 * width) / 3) handleNext();
                    }
                }}
                style={{ flex: 1 }}
            >
                {imageLoading ? (
                    <View style={{ flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color="#F68537" />
                        <Text style={{ color: 'white', marginTop: 16 }}>Decrypting Media...</Text>
                    </View>
                ) : (
                    <StatusRenderer
                        currentStatusUI={renderedStatusUI}
                        viewerVideoRef={viewerVideoRef}
                        onViewerPlaybackStatusUpdate={onViewerPlaybackStatusUpdate}
                    />
                )}
            </TouchableOpacity>

            <StatusOverlay
                currentStatusUI={renderedStatusUI} currentIndex={currentIndex} progress={progress}
                insets={insets} isOwner={isOwner} paused={paused} setPaused={setPaused}
                isReplying={isReplying} setIsReplying={setIsReplying} replyText={replyText} setReplyText={setReplyText}
                handleSendReply={handleSendReply} handleDeleteStatus={handleDeleteStatus}
                statusViewers={statusViewers} showViewers={showViewers} setShowViewers={setShowViewers} height={height}
            />

            {!!toastMessage && (
                <Animated.View style={{ position: 'absolute', bottom: isOwner ? 60 : 120, left: 20, right: 20, alignItems: 'center', justifyContent: 'center', opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }], zIndex: 100 }}>
                    <View style={{ backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{toastMessage}</Text>
                    </View>
                </Animated.View>
            )}
        </View>
    );
}

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
