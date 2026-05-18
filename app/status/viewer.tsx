import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, FlatList, Alert } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function StatusViewer() {
    const { userId, initialIndex, isArchive, date } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [statuses, setStatuses] = useState<any[]>([]);
    const viewerVideoRef = React.useRef<Video>(null);
    const [currentIndex, setCurrentIndex] = useState(parseInt(initialIndex as string || '0'));
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [showViewers, setShowViewers] = useState(false);
    const [statusViewers, setStatusViewers] = useState<any[]>([]);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
    }, []);

    const fetchStatuses = async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        console.log('StatusViewer: Fetching statuses for user:', userId, 'isArchive:', isArchive, 'date:', date);

        const now = new Date();
        const nowIso = now.toISOString();

        // 1. Fetch statuses only (robust against join errors)
        let query = supabase
            .from('statuses')
            .select('*')
            .eq('user_id', userId)
            .or('is_deleted.is.null,is_deleted.eq.false');

        if (isArchive === 'true') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            query = query.gt('created_at', sevenDaysAgo.toISOString());
        } else {
            query = query.gt('expires_at', nowIso);
        }

        const { data: statusData, error: statusError } = await query.order('created_at', { ascending: true });

        if (statusError) {
            console.error('StatusViewer: Status Fetch Error:', statusError);
        }

        // Filter by privacy (since RLS might be complex, we do it here)
        let accessibleStatuses = statusData || [];
        if (accessibleStatuses.length > 0 && currentUser) {
            accessibleStatuses = accessibleStatuses.filter((s: any) => {
                if (s.user_id === currentUser.id) return true;
                if (s.privacy_type === 'all' || !s.privacy_type) return true;
                if (s.privacy_type === 'selected' && s.viewer_ids?.includes(currentUser.id)) return true;
                return false;
            });
        }

        // 2. Fetch profile separately (ensure header info is available)
        const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', userId)
            .single();

        if (accessibleStatuses.length > 0) {
            const { decryptText, getChatKey } = await import('@/utils/chatCrypto');
            // Use owner's self-key for status decryption
            const statusKey = await getChatKey(userId as string, userId as string);

            const enrichedData = await Promise.all(accessibleStatuses.map(async (s) => {
                let decryptedContent = s.content;
                let decryptedMediaUrl = s.media_url;

                if (s.content && s.content.trim().startsWith('{')) {
                    try { decryptedContent = await decryptText(s.content, statusKey); } catch (e) {}
                }
                if (s.media_url && s.media_url.trim().startsWith('{')) {
                    try { decryptedMediaUrl = await decryptText(s.media_url, statusKey); } catch (e) {}
                }

                return {
                    ...s,
                    content: decryptedContent,
                    media_url: decryptedMediaUrl,
                    profiles: profile || { username: 'User', avatar_url: null }
                };
            }));

            let filteredData = enrichedData;
            
            // If specific date requested (History bundle)
            if (isArchive === 'true' && date) {
                const now = new Date();
                filteredData = enrichedData.filter(s => {
                    const sDate = new Date(s.created_at);
                    const diffDays = Math.floor((now.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));

                    let dKey = '';
                    if (diffDays === 0) dKey = 'Today';
                    else if (diffDays === 1) dKey = 'Yesterday';
                    else dKey = sDate.toLocaleDateString('en-US', { weekday: 'long' });

                    return dKey === date;
                });
            }

            console.log('StatusViewer: Status Data count:', accessibleStatuses.length, 'Filtered:', filteredData.length);
            setStatuses(filteredData);
        } else {
            setStatuses([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchStatuses();
    }, [userId, isArchive, date]);

    // Mark as seen and fetch viewers (if owner)
    const currentStatus = statuses[currentIndex];
    const isOwner = currentUser && userId === currentUser.id;

    useEffect(() => {
        if (!currentStatus || !currentUser) return;

        // 1. Report view if not owner
        if (!isOwner) {
            supabase.from('status_views').upsert([{
                status_id: currentStatus.id,
                viewer_id: currentUser.id
            }], { onConflict: 'status_id,viewer_id' }).then(({ error }) => {
                if (error && error.code !== '23505') console.error('Error reporting view:', error);
            });
        }

        // 2. Fetch viewers if owner
        if (isOwner) {
            fetchViewers(currentStatus.id);
        }
    }, [currentIndex, currentStatus, currentUser, isOwner]);

    const fetchViewers = useCallback(async (statusId: string) => {
        if (!statusId) return;
        try {
            const { data: views, error } = await supabase
                .from('status_views')
                .select('viewed_at, viewer_id')
                .eq('status_id', statusId)
                .order('viewed_at', { ascending: false });

            if (error) throw error;
            if (views && views.length > 0) {
                const viewerIds = views.map(v => v.viewer_id);
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url')
                    .in('id', viewerIds);

                const profileMap = profiles?.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {}) || {};
                const combined = views.map(v => {
                    const profile = profileMap[v.viewer_id];
                    return {
                        ...(profile || { id: v.viewer_id, username: 'Unknown User' }),
                        viewed_at: v.viewed_at,
                        profiles: profile // Compatible with existing UI keys
                    };
                });
                setStatusViewers(combined);
            } else {
                setStatusViewers([]);
            }
        } catch (error) {
            console.error("Error fetching viewers:", error);
            setStatusViewers([]);
        }
    }, []);

    // Real-time subscription for views
    useEffect(() => {
        if (!currentStatus?.id || !isOwner) return;

        console.log('StatusViewer: Subscribing to views for status:', currentStatus.id);
        const channel = supabase
            .channel(`status_views_${currentStatus.id}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'status_views', filter: `status_id=eq.${currentStatus.id}` },
                (payload) => {
                    console.log('StatusViewer: Received real-time view update:', payload);
                    fetchViewers(currentStatus.id);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentStatus?.id, isOwner, fetchViewers]);

    const handleNext = () => {
        if (currentIndex < statuses.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            router.back();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !currentUser || !currentStatusUI) return;
        
        try {
            // 1. Get/Generate Chat Key for this conversation
            const { getChatKey, encryptText } = await import('@/utils/chatCrypto');
            const chatKey = await getChatKey(currentUser.id, userId as string);
            
            if (!chatKey) throw new Error("Encryption key not found");

            // 2. Encrypt the reply text
            const encryptedReply = await encryptText(replyText.trim(), chatKey);

            // 3. Insert as an encrypted message
            const { error } = await supabase.from('messages').insert([{
                sender_id: currentUser.id,
                receiver_id: userId,
                message: encryptedReply, // Now encrypted!
                message_type: 'text',
                status: 'sent',
                is_read: false,
                status_id: currentStatusUI.id
            }]);

            if (error) throw error;

            setReplyText('');
            Alert.alert('Sent', 'Your reply has been sent! 🚀');
        } catch (error: any) {
            console.error('Error sending status reply:', error);
            Alert.alert('Error', 'Failed to send encrypted reply');
        }
    };

    const handleDeleteStatus = async () => {
        if (!currentStatusUI || !isOwner) return;

        Alert.alert(
            'Delete Status',
            'Are you sure you want to delete this status update?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('statuses')
                                .update({ is_deleted: true })
                                .eq('id', currentStatusUI.id);

                            if (error) throw error;

                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            
                            // Remove from local state
                            const updatedStatuses = statuses.filter(s => s.id !== currentStatusUI.id);
                            if (updatedStatuses.length === 0) {
                                router.back();
                            } else {
                                setStatuses(updatedStatuses);
                                if (currentIndex >= updatedStatuses.length) {
                                    setCurrentIndex(updatedStatuses.length - 1);
                                }
                            }
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to delete status');
                        }
                    }
                }
            ]
        );
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

    const currentStatusUI = statuses[currentIndex];

    // Parse trim parameters
    let trimStart = 0;
    let trimEnd = 999999;
    if (currentStatusUI?.media_url) {
        const url = currentStatusUI.media_url;
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
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'black' }}>
            {/* Media Content */}
            <TouchableOpacity
                activeOpacity={1}
                onPress={(e) => {
                    const x = e.nativeEvent.locationX;
                    if (x < width / 3) handlePrev();
                    else if (x > (2 * width) / 3) handleNext();
                }}
                style={{ flex: 1 }}
            >
                {currentStatusUI.media_type !== 'text' ? (
                    <View style={{ flex: 1 }}>
                        {currentStatusUI.media_type === 'video' ? (
                            <Video
                                ref={viewerVideoRef}
                                source={{ uri: currentStatusUI.media_url }}
                                rate={1.0}
                                volume={1.0}
                                isMuted={false}
                                resizeMode={ResizeMode.CONTAIN}
                                shouldPlay={true}
                                isLooping={true}
                                onPlaybackStatusUpdate={onViewerPlaybackStatusUpdate}
                                style={{ width: '100%', height: '100%' }}
                            />
                        ) : (
                            <Image
                                source={{ uri: currentStatusUI.media_url }}
                                style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                            />
                        )}
                        {currentStatusUI.content && (
                            <View style={{ position: 'absolute', bottom: 120, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' }}>
                                <Text style={{ color: 'white', fontSize: 16, textAlign: 'center', fontWeight: '500' }}>{currentStatusUI.content}</Text>
                            </View>
                        )}
                    </View>
                ) : (
                    <View
                        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: currentStatusUI.background_color || '#F68537' }}
                    >
                        <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold', textAlign: 'center' }}>
                            {currentStatusUI.content}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* Header / Progress Bars */}
            <View style={{ position: 'absolute', top: insets.top + 10, left: 0, right: 0, paddingHorizontal: 16, zIndex: 10 }}>
                <View style={{ flexDirection: 'row', gap: 4, marginBottom: 16 }}>
                    {statuses.map((_, index) => (
                        <View
                            key={index}
                            style={{
                                height: 3,
                                flex: 1,
                                borderRadius: 2,
                                backgroundColor: index <= currentIndex ? 'white' : 'rgba(255, 255, 255, 0.3)'
                            }}
                        />
                    ))}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Image
                            source={{ uri: currentStatusUI.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentStatusUI.profiles?.username || 'User')}&backgroundColor=F68537` }}
                            style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: 'white' }}
                        />
                        <View style={{ marginLeft: 12 }}>
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{currentStatusUI.profiles?.username || 'Unknown'}</Text>
                            <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 12 }}>
                                {new Date(currentStatusUI.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {isOwner && (
                            <TouchableOpacity onPress={handleDeleteStatus} style={{ padding: 8, marginRight: 8 }}>
                                <Ionicons name="trash-outline" size={24} color="#EF4444" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
                            <Ionicons name="close" size={32} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Footer / Reply or Views Pill */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: Math.max(insets.bottom, 20) }}>
                {isOwner ? (
                    <View style={{ alignItems: 'center' }}>
                        <TouchableOpacity
                            onPress={() => setShowViewers(true)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: 'rgba(246, 133, 55, 0.8)',
                                paddingHorizontal: 24,
                                paddingVertical: 12,
                                borderRadius: 30,
                                gap: 8
                            }}
                        >
                            <Ionicons name="eye-outline" size={20} color="white" />
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>{statusViewers.length} VIEWS</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: 30, paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.3)' }}>
                            <TextInput
                                placeholder="Reply to status..."
                                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                                style={{ flex: 1, color: 'white', fontSize: 15 }}
                                value={replyText}
                                onChangeText={setReplyText}
                            />
                            <TouchableOpacity 
                                style={{ marginLeft: 12 }}
                                onPress={handleSendReply}
                                disabled={!replyText.trim()}
                            >
                                <Ionicons name="send" size={24} color={replyText.trim() ? "#F68537" : "rgba(255, 255, 255, 0.3)"} />
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                )}
            </View>

            {/* Viewers Modal */}
            <Modal
                visible={showViewers}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowViewers(false)}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setShowViewers(false)}
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                >
                    <View style={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: height * 0.6, padding: 24 }}>
                        <View style={{ width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <View>
                                <Text style={{ fontSize: 20, fontWeight: '900', color: '#1E293B' }}>Viewed by {statusViewers.length}</Text>
                                <Text style={{ fontSize: 12, color: '#94A3B8' }}>Only you can see this</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <TouchableOpacity 
                                    onPress={() => {
                                        setShowViewers(false);
                                        handleDeleteStatus();
                                    }}
                                    style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                >
                                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                    <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Delete</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setShowViewers(false)}>
                                    <Ionicons name="close-circle" size={28} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {statusViewers.length > 0 ? (
                            <FlatList
                                data={statusViewers}
                                keyExtractor={(item) => item.id || item.viewer_id}
                                renderItem={({ item }) => (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                                        <Image
                                            source={{ uri: item.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.profiles?.username || 'User')}` }}
                                            style={{ width: 48, height: 48, borderRadius: 24 }}
                                        />
                                        <View style={{ marginLeft: 16 }}>
                                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1E293B' }}>{item.profiles?.username || 'Unknown User'}</Text>
                                            <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                                                Viewed {new Date(item.viewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            />
                        ) : (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="eye-off-outline" size={64} color="#E2E8F0" />
                                <Text style={{ color: '#94A3B8', marginTop: 16, fontWeight: '600' }}>No viewers yet</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}
