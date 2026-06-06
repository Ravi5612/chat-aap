import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

interface StatusMentionCardProps {
    statusId: string;
    isCurrentUser: boolean;
    targetUserId: string;
    router: any;
}

export default React.memo(function StatusMentionCard({ statusId, isCurrentUser, targetUserId, router }: StatusMentionCardProps) {
    const [status, setStatus] = useState<any>(null);
    const [senderProfile, setSenderProfile] = useState<any>(null);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const { data: s } = await supabase
                    .from('statuses')
                    .select('id, user_id, media_url, media_type, background_color, content')
                    .eq('id', statusId)
                    .single();
                if (s && mounted) {
                    setStatus(s);
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('username, avatar_url')
                        .eq('id', s.user_id)
                        .single();
                    if (profile && mounted) setSenderProfile(profile);
                }
            } catch (e) {}
        };
        load();
        return () => { mounted = false; };
    }, [statusId]);

    const hasImage = status?.media_url && (status?.media_type === 'image' || status?.media_type === 'video');
    const bgColor = status?.background_color || '#F68537';

    const accent = isCurrentUser ? 'white' : '#F68537';
    const subtextColor = isCurrentUser ? 'rgba(255,255,255,0.7)' : '#6B7280';
    const borderColor = isCurrentUser ? 'rgba(255,255,255,0.15)' : 'rgba(246,133,55,0.2)';

    const handlePress = React.useCallback(() => {
        router.push(`/status/viewer?userId=${targetUserId}&statusId=${statusId}`);
    }, [router, targetUserId, statusId]);

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={handlePress}
            style={[styles.card, { borderColor }]}
        >
            {/* Header row */}
            <View style={styles.header}>
                <View style={[styles.atBadge, { backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.25)' : 'rgba(246,133,55,0.15)' }]}>
                    <Ionicons name="at" size={16} color={accent} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.label, { color: accent }]}>
                        {isCurrentUser ? 'You mentioned them' : 'Mentioned you in a status'}
                    </Text>
                    {senderProfile && (
                        <Text style={[styles.sublabel, { color: subtextColor }]} numberOfLines={1}>
                            by {senderProfile.username}
                        </Text>
                    )}
                </View>
                {senderProfile?.avatar_url && (
                    <Image
                        source={{ uri: senderProfile.avatar_url }}
                        style={styles.avatar}
                        cachePolicy="memory-disk"
                    />
                )}
            </View>

            {/* Status Preview */}
            <View style={[styles.preview, { backgroundColor: hasImage ? '#000' : bgColor }]}>
                {hasImage ? (
                    <Image
                        source={{ uri: status.media_url }}
                        style={StyleSheet.absoluteFillObject}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                ) : (
                    status?.content ? (
                        <Text style={styles.previewText} numberOfLines={3}>{status.content}</Text>
                    ) : (
                        <Ionicons name="image-outline" size={32} color="rgba(255,255,255,0.5)" />
                    )
                )}
                {/* Gradient overlay */}
                <View style={styles.previewOverlay}>
                    <Ionicons name="play-circle" size={28} color="white" style={{ opacity: 0.9 }} />
                </View>
            </View>

            {/* View Status CTA */}
            <View style={[styles.footer, { borderTopColor: borderColor }]}>
                <Text style={[styles.ctaText, { color: accent }]}>Tap to view status</Text>
                <Ionicons name="arrow-forward-circle" size={18} color={accent} />
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    card: {
        width: 230,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        margin: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 10,
    },
    atBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        lineHeight: 17,
    },
    sublabel: {
        fontSize: 11,
        marginTop: 1,
    },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginLeft: 8,
    },
    preview: {
        width: '100%',
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 15,
        textAlign: 'center',
        paddingHorizontal: 12,
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    previewOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderTopWidth: 1,
    },
    ctaText: {
        fontSize: 13,
        fontWeight: '700',
    },
});
