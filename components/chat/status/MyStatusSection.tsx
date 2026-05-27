import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusThumbnail from './StatusThumbnail';
import { useAuthStore } from '@/store/useAuthStore';

interface MyStatusSectionProps {
    myStatuses: any;
    statusInfo: any;
    onAddClick: () => void;
    onViewMyStatus: () => void;
}

export default function MyStatusSection({
    myStatuses,
    statusInfo,
    onAddClick,
    onViewMyStatus
}: MyStatusSectionProps) {
    const currentUser = useAuthStore(state => state.user);
    const currentProfile = useAuthStore(state => state.profile);

    return (
        <View style={{ marginRight: 24 }}>
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1.2 }}>
                My Status
            </Text>

            <View style={{ flexDirection: 'row', gap: 20 }}>
                {/* Always show Add New button */}
                <View style={{ alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity
                        onPress={onAddClick}
                        style={{
                            width: 72,
                            height: 72,
                            borderRadius: 36,
                            borderWidth: 2,
                            borderStyle: 'dashed',
                            borderColor: '#F68537',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'transparent'
                        }}
                    >
                        <Ionicons name="add" size={32} color="#F68537" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#94A3B8' }}>ADD NEW</Text>
                </View>

                {/* Show Active Bundle if any */}
                {myStatuses?.active && myStatuses.active.length > 0 && (() => {
                    const allViewed = myStatuses.active.every((s: any) => s.isViewed);
                    const hasUploading = myStatuses.active.some((s: any) => s.isUploading);
                    const activeFirst = myStatuses.active[0];
                    const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentProfile?.username || 'User')}&backgroundColor=F68537`;

                    return (
                        <View style={{ alignItems: 'center', gap: 10 }}>
                            <View style={{ position: 'relative' }}>
                                <TouchableOpacity
                                    onPress={hasUploading ? () => Alert.alert("Uploading Status", "Please wait, your status is being posted in the background...") : onViewMyStatus}
                                    style={{
                                        width: 72,
                                        height: 72,
                                        borderRadius: 36,
                                        borderWidth: 3,
                                        borderColor: hasUploading ? '#F68537' : (allViewed ? '#D1D5DB' : '#10B981'),
                                        padding: 3,
                                        backgroundColor: 'white'
                                    }}
                                >
                                    <View style={{ width: '100%', height: '100%', borderRadius: 32, overflow: 'hidden', backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                                        {hasUploading ? (
                                            <StatusThumbnail
                                                mediaType={activeFirst.media_type}
                                                mediaUrl={activeFirst.media_url}
                                                text={activeFirst.content}
                                                bgColor={activeFirst.background_color}
                                                isUploading={true}
                                            />
                                        ) : (
                                            <StatusThumbnail
                                                mediaType={statusInfo?.[currentUser?.id || '']?.mediaType || 'image'}
                                                mediaUrl={statusInfo?.[currentUser?.id || '']?.thumbnail || currentProfile?.avatar_url || defaultAvatar}
                                                text={statusInfo?.[currentUser?.id || '']?.text}
                                                bgColor={statusInfo?.[currentUser?.id || '']?.bgColor}
                                                showPlayIcon={statusInfo?.[currentUser?.id || '']?.mediaType === 'video'}
                                            />
                                        )}
                                    </View>
                                </TouchableOpacity>
                                {!hasUploading && (
                                    <View style={{
                                        position: 'absolute',
                                        top: -2,
                                        right: -2,
                                        backgroundColor: allViewed ? '#94A3B8' : '#10B981',
                                        width: 22,
                                        height: 22,
                                        borderRadius: 11,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderWidth: 2,
                                        borderColor: 'white'
                                    }}>
                                        <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{myStatuses.active.length}</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={{ fontSize: 9, fontWeight: '900', color: hasUploading ? '#F68537' : (allViewed ? '#94A3B8' : '#10B981') }}>
                                {hasUploading ? 'SENDING...' : 'VIEWING...'}
                            </Text>
                        </View>
                    );
                })()}
            </View>
        </View>
    );
}
