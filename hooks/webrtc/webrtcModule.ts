let WebRTCModule: any = {};
try {
    // We use require instead of import to prevent top-level crash in Expo Go
    WebRTCModule = require('react-native-webrtc');
} catch (e) {
    console.warn("WebRTC native module not found. This is expected in Expo Go.");
}

export const {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    mediaDevices,
    MediaStream,
} = WebRTCModule;

export const isWebRTCSupported = !!RTCPeerConnection;
