import React from 'react';
import { View, Text, Platform } from 'react-native';

let RtcSurfaceView: any = null;
try {
    if (Platform.OS !== 'web') {
        RtcSurfaceView = require('react-native-agora').RtcSurfaceView;
    }
} catch (e) {
    // Silence error
}

export default function AgoraVideoView({ uid, style }: { uid: number; style: any }) {
    if (!RtcSurfaceView) {
        return (
            <View style={[style, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: 'white', fontSize: 10 }}>Video Preview (Dev Client required)</Text>
            </View>
        );
    }

    return (
        <RtcSurfaceView
            canvas={{ uid }}
            style={style}
        />
    );
}
