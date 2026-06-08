import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const CallTimer = ({ duration }: { duration: number }) => {
    return (
        <View style={styles.timerContainer}>
            <View style={styles.recordingDot} />
            <Text style={styles.timerText}>{formatDuration(duration)}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    timerContainer: {
        position: 'absolute', top: 60, left: 24,
        backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 20, flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    recordingDot: { width: 8, height: 8, backgroundColor: '#EF4444', borderRadius: 4, marginRight: 8 },
    timerText: { color: 'white', fontSize: 14, fontWeight: '600' },
});
