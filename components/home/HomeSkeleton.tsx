import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';

const SKELETON_ITEMS = [1, 2, 3];

export default React.memo(function HomeSkeleton() {
    return (
        <View style={styles.container}>
            {SKELETON_ITEMS.map(i => (
                <View key={i} style={styles.row}>
                    <Skeleton width={56} height={56} borderRadius={28} />
                    <View style={styles.textStack}>
                        <Skeleton width="60%" height={18} />
                        <Skeleton width="40%" height={14} />
                    </View>
                    <Skeleton width={40} height={12} />
                </View>
            ))}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        padding: 16,
        flex: 1
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20
    },
    textStack: {
        flex: 1,
        gap: 8
    }
});
