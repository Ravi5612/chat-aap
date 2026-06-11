import React, { useRef, useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Dimensions, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, interpolate, runOnJS } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter as useExpoRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useFriendsStore } from '@/store/useFriendsStore';

// Hooks
import { useStatusFetcher } from '@/hooks/useStatusFetcher';
import { useStatusViewers } from '@/hooks/useStatusViewers';
import { useStatusControls } from '@/hooks/useStatusControls';
import { useMessageMediaCache } from '@/hooks/useMessageMediaCache';
import { useStatusViewerScreenshotPrevention } from '@/hooks/status/useStatusViewerScreenshotPrevention';
import { useStatusPlayback } from '@/hooks/status/useStatusPlayback';
import { useStatusReply } from '@/hooks/status/useStatusReply';

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
    const [showViewers, setShowViewers] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const toastAnim = useSharedValue(0);

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

    // Get friend's allow_status_download setting from store
    const allowStatusDownload = (() => {
        try {
            const friends = useFriendsStore.getState().combinedItems;
            const friendData = friends.find((f: any) => f.id === userId);
            return friendData?.friend?.allow_status_download ?? false;
        } catch (e) {
            console.error('[STATUS VIEWER] Failed to get allow_status_download:', e);
            return false;
        }
    })();

    const { localImageUrl, localVoiceUrl, imageLoading } = useMessageMediaCache(
        currentStatusUI || {},
        currentStatusUI?.media_type !== 'text' ? currentStatusUI?.media_url : null,
        currentStatusUI?.audio_url || null,
        null,
        currentStatusUI?.statusKey || null
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
        toastAnim.value = withSequence(
            withTiming(1, { duration: 300 }),
            withDelay(2000, withTiming(0, { duration: 300 }, (finished) => {
                if (finished) runOnJS(setToastMessage)('');
            }))
        );
    };

    // Screenshot Prevention
    useStatusViewerScreenshotPrevention(userId as string, isOwner);

    // Playback Hook (handles video pausing and bg music)
    useStatusPlayback(statuses, currentIndex, renderedStatusUI, viewerVideoRef, paused);

    // Reply Hook
    const { replyText, setReplyText, handleSendReply } = useStatusReply(currentUser, userId as string, renderedStatusUI, showToast);

    const handleDeleteStatus = async () => {
        if (!currentStatusUI || !isOwner) return;
        Alert.alert('Delete Status', 'Are you sure you want to delete this status update?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
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

    const toastAnimatedStyle = useAnimatedStyle(() => ({
        opacity: toastAnim.value,
        transform: [{ translateY: interpolate(toastAnim.value, [0, 1], [20, 0]) }]
    }));

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
                statuses={statuses}
                currentStatusUI={renderedStatusUI} currentIndex={currentIndex} progress={progress}
                insets={insets} isOwner={isOwner} paused={paused} setPaused={setPaused}
                isReplying={isReplying} setIsReplying={setIsReplying} replyText={replyText} setReplyText={setReplyText}
                handleSendReply={handleSendReply} handleDeleteStatus={handleDeleteStatus}
                statusViewers={statusViewers} showViewers={showViewers} setShowViewers={setShowViewers} height={height}
                allowStatusDownload={allowStatusDownload}
            />

            {!!toastMessage && (
                <Animated.View style={[{ position: 'absolute', bottom: isOwner ? 60 : 120, left: 20, right: 20, alignItems: 'center', justifyContent: 'center', zIndex: 100 }, toastAnimatedStyle]}>
                    <View style={{ backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{toastMessage}</Text>
                    </View>
                </Animated.View>
            )}
        </View>
    );
}

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
