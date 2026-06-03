import React, { useMemo } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';

let RtcSurfaceView: any = null;
let RtcTextureView: any = null;

try {
    if (Platform.OS !== 'web') {
        const Agora = require('react-native-agora');
        RtcSurfaceView = Agora.RtcSurfaceView;
        RtcTextureView = Agora.RtcTextureView;
    }
} catch (e) {
    console.error('[AgoraView] Failed to load native views', e);
}

interface AgoraVideoViewProps {
    uid: number;
    style: any;
    zOrderMediaOverlay?: boolean;
    zOrderOnTop?: boolean;
    useTextureView?: boolean;
    channelId?: string;
}

const AgoraVideoView = React.memo(({
    uid,
    style,
    zOrderMediaOverlay = false,
    zOrderOnTop = false,
    useTextureView = false,
    channelId
}: AgoraVideoViewProps) => {
    if (!RtcSurfaceView) {
        return (
            <View style={[style, styles.fallback]}>
                <Text style={styles.fallbackText}>Video Preview</Text>
            </View>
        );
    }

    // Explicitly parse the UID to a safe number (integer)
    const safeUid = parseInt(String(uid), 10);
    if (isNaN(safeUid)) {
        return (
            <View style={[style, styles.fallback]}>
                <Text style={styles.fallbackText}>Connecting...</Text>
            </View>
        );
    }

    // fallback to RtcSurfaceView if RtcTextureView is not loaded or causing issues
    const ViewComponent = useTextureView ? (RtcTextureView || RtcSurfaceView) : RtcSurfaceView;

    // Memoize canvas object — avoids passing a new object reference on every render
    // which would cause the native Agora view to unnecessarily re-render mid-call
    const canvasObj = useMemo(() => {
        const obj: any = { uid: safeUid };
        if (channelId) obj.channelId = channelId;
        return obj;
    }, [safeUid, channelId]);

    return (
        <ViewComponent
            canvas={canvasObj}
            style={style}
            zOrderMediaOverlay={zOrderMediaOverlay}
            zOrderOnTop={zOrderOnTop}
        />
    );
});

const styles = StyleSheet.create({
    fallback: {
        backgroundColor: '#1F2937',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fallbackText: {
        color: 'white',
        fontSize: 10,
    }
});

export default AgoraVideoView;

