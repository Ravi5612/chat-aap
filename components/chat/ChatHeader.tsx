import React, { useState, useCallback, useMemo, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import ChatMenu from '@/components/chat/ChatMenu';
import { useFriendsStore } from '@/store/useFriendsStore';

interface ChatHeaderProps {
    safeTop: number;
    friendId: string;
    friendName: string;
    friendImage: string;
    isGroup: boolean;
    isTyping: boolean;
    isUserOnline: boolean;
    lastSeen: string | undefined;
    isFriend: boolean | null;
    isBlocked: boolean;
    iAmBlocked: boolean;
    isMember: boolean;
    currentUserId: string | undefined;
    handleStartCall: (friend: any, type: 'audio' | 'video', isGroup: boolean) => void;
    handleViewProfile: () => void;
    handleClearChat: () => void;
    handleBlockToggle: () => void;
    handleUnfriend: () => void;
    handleSetWallpaper: () => void;
    setLedgerVisible: (visible: boolean) => void;
    onSetDisappearingMessages: () => void;
    onViewScheduledMessages: () => void;
    disappearingDuration: number;
    autoListenMode: boolean;
    onToggleAutoListen: () => void;
}

// Moved outside component — pure function, never changes
const formatLastSeen = (timestamp: string | undefined): string => {
    if (!timestamp) return 'offline';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffInDays === 0 && now.getDate() === date.getDate()) return `last seen today at ${timeStr}`;
    if (diffInDays === 1 || (diffInDays === 0 && now.getDate() !== date.getDate())) return `last seen yesterday at ${timeStr}`;
    return `last seen ${date.toLocaleDateString()}`;
};

const ChatHeader = memo(({
    safeTop,
    friendId,
    friendName,
    friendImage,
    isGroup,
    isTyping,
    isUserOnline,
    lastSeen,
    isFriend,
    isBlocked,
    iAmBlocked,
    isMember,
    currentUserId,
    handleStartCall,
    handleViewProfile,
    handleClearChat,
    handleBlockToggle,
    handleUnfriend,
    handleSetWallpaper,
    setLedgerVisible,
    onSetDisappearingMessages,
    onViewScheduledMessages,
    disappearingDuration,
    autoListenMode,
    onToggleAutoListen,
}: ChatHeaderProps) => {
    const router = useRouter();
    const [menuVisible, setMenuVisible] = useState(false);

    const gender = useFriendsStore(state => state.friends.find(f => f.id === friendId)?.gender);

    // Memoized — only recalculates when friendImage/friendName/isGroup/gender change
    const avatarSource = useMemo(() => {
        if (friendImage) return friendImage;
        if (isGroup) return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(friendName || 'Group')}&backgroundColor=F68537`;
        if (gender === 'female') return require('@/assets/images/default-avatar-female.jpg');
        if (gender === 'other') return require('@/assets/images/default-avatar-other.png');
        return require('@/assets/images/default-avatar-male.jpg');
    }, [friendImage, isGroup, friendName, gender]);

    // Stable friend object for call handlers
    const friendObj = useMemo(() => ({ id: friendId, name: friendName, img: friendImage }), [friendId, friendName, friendImage]);

    const goBack = useCallback(() => { Haptics.selectionAsync(); router.back(); }, [router]);
    const goGroupInfo = useCallback(() => router.push(`/group-info?groupId=${friendId}&groupName=${encodeURIComponent(friendName || 'Group')}&groupImage=${encodeURIComponent(friendImage || '')}` as any), [router, friendId, friendName, friendImage]);
    const handleProfilePress = useCallback(() => isGroup ? goGroupInfo() : handleViewProfile(), [isGroup, goGroupInfo, handleViewProfile]);
    const startVideoCall = useCallback(() => handleStartCall(friendObj, 'video', isGroup), [handleStartCall, friendObj, isGroup]);
    const startAudioCall = useCallback(() => handleStartCall(friendObj, 'audio', isGroup), [handleStartCall, friendObj, isGroup]);
    const toggleMenu = useCallback(() => setMenuVisible(v => !v), []);
    const closeMenu = useCallback(() => setMenuVisible(false), []);
    const toggleAutoListen = useCallback(() => { Haptics.selectionAsync(); onToggleAutoListen(); }, [onToggleAutoListen]);
    const openLedger = useCallback(() => { closeMenu(); setLedgerVisible(true); }, [closeMenu, setLedgerVisible]);
    const openDisappearing = useCallback(() => { closeMenu(); onSetDisappearingMessages(); }, [closeMenu, onSetDisappearingMessages]);
    const openScheduled = useCallback(() => { closeMenu(); onViewScheduledMessages(); }, [closeMenu, onViewScheduledMessages]);
    const leaveGroup = useCallback(async () => {
        if (!currentUserId || !friendId) return;
        const success = await useFriendsStore.getState().leaveGroup(currentUserId, friendId);
        if (success) router.back();
    }, [currentUserId, friendId, router]);

    const statusColor = isTyping || isUserOnline ? '#10B981' : '#94A3B8';
    const statusText = isTyping ? 'typing...' : (isUserOnline ? 'online' : formatLastSeen(lastSeen));

    return (
        <View style={[styles.container, { paddingTop: safeTop }]}>
            <View style={styles.leftSection}>
                <TouchableOpacity onPress={goBack}>
                    <Ionicons name="chevron-back" size={28} color="#F68537" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleProfilePress} style={styles.profileRow}>
                    <Image source={avatarSource} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" />
                    <View>
                        <Text style={styles.friendName}>{friendName || 'User'}</Text>
                        <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
                    </View>
                    {disappearingDuration > 0 && (
                        <View style={styles.timerBadge}>
                            <Ionicons name="timer" size={14} color="#F59E0B" />
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.rightSection}>
                {/* Auto-Listen Mode Toggle */}
                <TouchableOpacity
                    onPress={toggleAutoListen}
                    style={[styles.iconBtn, autoListenMode ? styles.iconBtnActive : styles.iconBtnInactive]}
                >
                    <Ionicons
                        name={autoListenMode ? 'volume-high' : 'volume-high-outline'}
                        size={18}
                        color={autoListenMode ? 'white' : '#F68537'}
                    />
                </TouchableOpacity>

                {isFriend && !isBlocked && !iAmBlocked && (
                    <>
                        <TouchableOpacity onPress={startVideoCall} style={styles.callBtn}>
                            <Ionicons name="videocam" size={18} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={startAudioCall} style={styles.callBtn}>
                            <Ionicons name="call" size={18} color="white" />
                        </TouchableOpacity>
                    </>
                )}

                <TouchableOpacity onPress={toggleMenu} style={styles.menuBtn}>
                    <Ionicons name="ellipsis-vertical" size={24} color="#F68537" />
                </TouchableOpacity>
                <ChatMenu
                    visible={menuVisible}
                    onClose={closeMenu}
                    onViewProfile={handleViewProfile}
                    onGroupInfo={goGroupInfo}
                    onClearChat={handleClearChat}
                    onBlockUser={handleBlockToggle}
                    onUnfriend={handleUnfriend}
                    isBlocked={isBlocked}
                    isMember={isMember}
                    isGroup={isGroup}
                    onLeaveGroup={leaveGroup}
                    onSetWallpaper={handleSetWallpaper}
                    onLedger={openLedger}
                    onSetDisappearingMessages={openDisappearing}
                    onViewScheduledMessages={openScheduled}
                />
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 10,
        zIndex: 1000,
        elevation: 4,
    },
    leftSection: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#F68537' },
    friendName: { fontWeight: '900', color: '#F68537', fontSize: 16, letterSpacing: -0.5 },
    statusText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
    timerBadge: { backgroundColor: '#FDF0D5', padding: 4, borderRadius: 12, marginLeft: 4 },
    rightSection: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
    iconBtnActive: { backgroundColor: '#F68537', borderColor: '#F68537' },
    iconBtnInactive: { backgroundColor: 'rgba(246,133,55,0.1)', borderColor: 'rgba(246,133,55,0.3)' },
    callBtn: { backgroundColor: '#F68537', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    menuBtn: { padding: 4 },
});

export default ChatHeader;

