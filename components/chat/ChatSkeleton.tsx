import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatSkeletonProps {
    safeTop: number;
    safeBottom: number;
}

export default function ChatSkeleton({ safeTop, safeBottom }: ChatSkeletonProps) {
    const bottomPadding = safeBottom > 0 ? safeBottom : 12;
    
    return (
        <View style={{ flex: 1, backgroundColor: '#EBD8B7' }}>
            <View style={{ paddingTop: safeTop, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10 }}>
                <Ionicons name="chevron-back" size={28} color="#F68537" style={{ opacity: 0.5 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 4 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E2E8F0' }} />
                    <View>
                        <View style={{ width: 100, height: 16, backgroundColor: '#E2E8F0', borderRadius: 4, marginBottom: 4 }} />
                        <View style={{ width: 60, height: 10, backgroundColor: '#E2E8F0', borderRadius: 4 }} />
                    </View>
                </View>
            </View>
            <View style={{ flex: 1, padding: 16 }}>
                <View style={{ alignSelf: 'flex-start', width: '60%', height: 60, backgroundColor: 'white', borderRadius: 20, borderBottomLeftRadius: 4, marginBottom: 16, opacity: 0.6 }} />
                <View style={{ alignSelf: 'flex-end', width: '50%', height: 45, backgroundColor: '#F68537', borderRadius: 20, borderBottomRightRadius: 4, marginBottom: 16, opacity: 0.3 }} />
            </View>
            <View style={{ paddingBottom: bottomPadding, backgroundColor: 'transparent' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 10 }}>
                    <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 25, height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, elevation: 2 }}>
                        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#E2E8F0', marginLeft: 8 }} />
                        <View style={{ flex: 1, height: 20, backgroundColor: '#E2E8F0', borderRadius: 4, marginHorizontal: 12 }} />
                        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#E2E8F0', marginRight: 8 }} />
                    </View>
                    <View style={{ height: 48, width: 48, borderRadius: 24, backgroundColor: '#F68537', opacity: 0.8 }} />
                </View>
            </View>
        </View>
    );
}
