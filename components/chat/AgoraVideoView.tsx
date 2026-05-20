import React from 'react';
import { View, Text, Platform } from 'react-native';

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

export default function AgoraVideoView({ 
    uid, 
    style, 
    zOrderMediaOverlay = false,
    zOrderOnTop = false,
    useTextureView = false,
    channelId
}: AgoraVideoViewProps) {
    if (!RtcSurfaceView) {
        return (
            <View style={[style, { backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: 'white', fontSize: 10 }}>Video Preview</Text>
            </View>
        );
    }

    // Explicitly parse the UID to a safe number (integer)
    const safeUid = parseInt(String(uid), 10);
    if (isNaN(safeUid)) {
        return (
            <View style={[style, { backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: 'white', fontSize: 10 }}>Connecting...</Text>
            </View>
        );
    }

    // fallback to RtcSurfaceView if RtcTextureView is not loaded or causing issues
    const ViewComponent = useTextureView ? (RtcTextureView || RtcSurfaceView) : RtcSurfaceView;

    const canvasObj: any = { uid: safeUid };
    if (channelId) {
        canvasObj.channelId = channelId;
    }

    return (
        <ViewComponent
            canvas={canvasObj}
            style={style}
            zOrderMediaOverlay={zOrderMediaOverlay}
            zOrderOnTop={zOrderOnTop}
        />
    );
}
