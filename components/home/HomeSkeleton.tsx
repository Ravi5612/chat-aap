import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';

export default function HomeSkeleton() {
    return (
        <View style={{ padding: 16, flex: 1 }}>
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
    );
}
