import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';

interface GlassHeaderProps {
    children: React.ReactNode;
    style?: any;
}

export const GlassHeader = ({ children, style }: GlassHeaderProps) => {
    return (
        <View style={styles.container}>
            {Platform.OS !== 'android' ? (
                <BlurView intensity={80} tint="light" style={[styles.blur, style]}>
                    <SafeAreaView edges={['top']} style={styles.safe}>
                        <View style={styles.content}>
                            {children}
                        </View>
                    </SafeAreaView>
                </BlurView>
            ) : (
                <View style={[styles.androidHeader, style]}>
                    <SafeAreaView edges={['top']} style={styles.safe}>
                        <View style={styles.content}>
                            {children}
                        </View>
                    </SafeAreaView>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        zIndex: 100,
    },
    blur: {
        width: '100%',
    },
    androidHeader: {
        backgroundColor: '#F68537', // Fallback for Android performance
        width: '100%',
    },
    safe: {
        width: '100%',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
});
