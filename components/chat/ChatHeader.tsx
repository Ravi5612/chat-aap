import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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
}

export default function ChatHeader({
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
    setLedgerVisible
}: ChatHeaderProps) {
    const router = useRouter();
    const [menuVisible, setMenuVisible] = useState(false);

    const formatLastSeen = (timestamp: string | undefined) => {
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

    return (
        <View style={{ paddingTop: safeTop, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 10, zIndex: 1000, elevation: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={() => { Haptics.selectionAsync(); router.back(); }}>
                    <Ionicons name="chevron-back" size={28} color="#F68537" />
                </TouchableOpacity>
                <TouchableOpacity onPress={isGroup ? () => router.push(`/group-info?groupId=${friendId}&groupName=${encodeURIComponent(friendName || 'Group')}&groupImage=${encodeURIComponent(friendImage || '')}` as any) : handleViewProfile} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Image source={{ uri: friendImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(friendName || 'User')}&backgroundColor=F68537` }} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#F68537' }} contentFit="cover" />
                    <View>
                        <Text style={{ fontWeight: '900', color: '#F68537', fontSize: 16, letterSpacing: -0.5 }}>{friendName || 'User'}</Text>
                        <Text style={{ fontSize: 10, color: isTyping ? '#10B981' : (isUserOnline ? '#10B981' : '#94A3B8'), fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {isTyping ? 'typing...' : (isUserOnline ? 'online' : formatLastSeen(lastSeen))}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {isFriend && !isBlocked && !iAmBlocked && (
                    <>
                        <TouchableOpacity 
                            onPress={() => handleStartCall({ id: friendId, name: friendName }, 'video', isGroup)} 
                            style={{ backgroundColor: '#F68537', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Ionicons name="videocam" size={18} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => handleStartCall({ id: friendId, name: friendName }, 'audio', isGroup)} 
                            style={{ backgroundColor: '#F68537', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Ionicons name="call" size={18} color="white" />
                        </TouchableOpacity>
                    </>
                )}

                <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)} style={{ padding: 4 }}>
                    <Ionicons name="ellipsis-vertical" size={24} color="#F68537" />
                </TouchableOpacity>
                <ChatMenu 
                    visible={menuVisible} 
                    onClose={() => setMenuVisible(false)} 
                    onViewProfile={handleViewProfile} 
                    onGroupInfo={() => router.push(`/group-info?groupId=${friendId}&groupName=${encodeURIComponent(friendName || 'Group')}&groupImage=${encodeURIComponent(friendImage || '')}` as any)}
                    onClearChat={handleClearChat} 
                    onBlockUser={handleBlockToggle} 
                    onUnfriend={handleUnfriend}
                    isBlocked={isBlocked} 
                    isMember={isMember} 
                    isGroup={isGroup} 
                    onLeaveGroup={async () => {
                        if (!currentUserId || !friendId) return;
                        const success = await useFriendsStore.getState().leaveGroup(currentUserId, friendId);
                        if (success) router.back();
                    }} 
                    onSetWallpaper={handleSetWallpaper} 
                    onLedger={() => { setMenuVisible(false); setLedgerVisible(true); }} 
                />
            </View>
        </View>
    );
}
