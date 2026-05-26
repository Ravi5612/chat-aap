import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { GlassHeader } from '@/components/ui/GlassHeader';

export default function HomeSkeleton() {
    return (
        <View style={{ flex: 1, backgroundColor: '#EBD8B7' }}>
            <GlassHeader>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Skeleton width={48} height={48} borderRadius={24} />
                    <Skeleton width={100} height={20} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Skeleton width={120} height={36} borderRadius={18} />
                    <Skeleton width={32} height={32} borderRadius={16} />
                </View>
            </GlassHeader>
            <View style={{ padding: 16 }}>
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <Skeleton width={56} height={56} borderRadius={28} />
                        <View style={{ flex: 1, gap: 8 }}>
                            <Skeleton width="60%" height={18} />
                            <Skeleton width="40%" height={14} />
                        </View>
                        <Skeleton width={40} height={12} />
                    </View>
                ))}
            </View>
        </View>
    );
}
