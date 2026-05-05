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
}

export default function AgoraVideoView({ 
    uid, 
    style, 
    zOrderMediaOverlay = false,
    zOrderOnTop = false,
    useTextureView = false
}: AgoraVideoViewProps) {
    if (!RtcSurfaceView) {
        return (
            <View style={[style, { backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: 'white', fontSize: 10 }}>Video Preview</Text>
            </View>
        );
    }

    // On Android, use RtcTextureView for PIP/Overlays to avoid layering issues
    const ViewComponent = (useTextureView || Platform.OS === 'android' && (zOrderMediaOverlay || zOrderOnTop)) 
        ? (RtcTextureView || RtcSurfaceView) 
        : RtcSurfaceView;

    return (
        <ViewComponent
            canvas={{ uid: uid }}
            style={style}
            zOrderMediaOverlay={zOrderMediaOverlay}
            zOrderOnTop={zOrderOnTop}
        />
    );
}
