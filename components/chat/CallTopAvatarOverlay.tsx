import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface Props {
    friend: any;
    callState: string;
}

export const CallTopAvatarOverlay = ({ friend, callState }: Props) => {
    let finalAvatarSource: any;
    if (friend?.avatar_url) {
        finalAvatarSource = { uri: friend.avatar_url };
    } else if (friend?.img) {
        if (typeof friend.img === 'string' && friend.img.startsWith('http')) {
            finalAvatarSource = { uri: friend.img };
        } else {
            finalAvatarSource = friend.img;
        }
    } else {
        finalAvatarSource = require('@/assets/images/default-avatar-male.jpg');
    }

    return (
        <View style={styles.topAvatarOverlay} pointerEvents="none">
            <View style={styles.smallAvatarContainer}>
                <Image source={finalAvatarSource} style={styles.fullImage} contentFit="cover"  cachePolicy="memory-disk" />
            </View>
            <Text style={styles.topFriendName}>{friend?.name || friend?.username || 'Friend'}</Text>
            <Text style={styles.topCallStatus}>{callState === 'outgoing' ? 'Calling...' : 'Ringing...'}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    topAvatarOverlay: {
        position: 'absolute',
        top: 80,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 10,
    },
    smallAvatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: '#F68537',
        overflow: 'hidden',
        marginBottom: 12,
        backgroundColor: '#1F2937',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
        elevation: 8,
    },
    fullImage: { width: '100%', height: '100%' },
    topFriendName: { fontSize: 24, fontWeight: 'bold', color: 'white', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5 },
    topCallStatus: { color: '#E5E7EB', fontSize: 16, marginTop: 4, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5 },
});
