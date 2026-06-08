import { useState, useCallback, MutableRefObject } from 'react';
import { RTCPeerConnection, isWebRTCSupported } from './webrtcModule';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
    ],
};

export const useWebRTCPeerConnection = (
    channelRef: MutableRefObject<any>,
    peerConnection: MutableRefObject<any>
) => {
    const [remoteStream, setRemoteStream] = useState<any>(null);
    const [connectionStatus, setConnectionStatus] = useState('new');

    const createPeerConnection = useCallback((stream: any) => {
        if (!stream || !isWebRTCSupported) return null;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnection.current = pc;

        stream.getTracks().forEach((track: any) => {
            pc.addTrack(track, stream);
        });

        pc.addEventListener('track', (event: any) => {
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0]);
            }
        });

        pc.addEventListener('icecandidate', (event: any) => {
            if (event.candidate && channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'signal',
                    payload: { type: 'ice-candidate', candidate: event.candidate }
                });
            }
        });

        pc.addEventListener('connectionstatechange', () => {
            setConnectionStatus(pc.connectionState);
        });

        return pc;
    }, [channelRef, peerConnection]);

    return {
        remoteStream,
        connectionStatus,
        createPeerConnection
    };
};
