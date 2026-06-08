import React from 'react';
import { View, StyleSheet } from 'react-native';

export const StatusListSkeleton = ({ topInset }: { topInset: number }) => {
    return (
        <View style={[styles.container, { paddingTop: topInset }]}>
            <View style={styles.skeletonHeader}>
                <View style={styles.skeletonTitle} />
                <View style={styles.skeletonSubTitle} />
            </View>
            <View style={{ paddingHorizontal: 20 }}>
                <View style={styles.skeletonMyStatus} />
                {[1, 2, 3].map((i) => (
                    <View key={i} style={styles.skeletonItem} />
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#EBD8B7' },
    skeletonHeader: { paddingHorizontal: 20, paddingVertical: 12 },
    skeletonTitle: { width: 100, height: 28, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 8, marginBottom: 4 },
    skeletonSubTitle: { width: 80, height: 12, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4 },
    skeletonMyStatus: { height: 120, backgroundColor: 'white', borderRadius: 24, marginBottom: 20, marginTop: 10, opacity: 0.6 },
    skeletonItem: { height: 80, backgroundColor: 'white', borderRadius: 24, marginBottom: 12, opacity: 0.6 }
});
