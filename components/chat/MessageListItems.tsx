import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

// System event message (e.g. "User joined the group")
export const SystemMessage = React.memo(function SystemMessage({ message, createdAt }: { message: string; createdAt: string }) {
    const time = React.useMemo(() => new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), [createdAt]);
    return (
        <View style={styles.systemContainer}>
            <View style={styles.systemBubble}>
                <Text style={styles.systemText}>{message}</Text>
                <Text style={styles.systemTime}>{time}</Text>
            </View>
        </View>
    );
});

// Date separator between message groups
export const DateSeparator = React.memo(function DateSeparator({ date }: { date: string }) {
    const dayLabel = React.useMemo(() => {
        const d = new Date(date);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        if (d.toDateString() === today.toDateString()) return 'TODAY';
        if (d.toDateString() === yesterday.toDateString()) return 'YESTERDAY';
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    }, [date]);

    return (
        <View style={styles.dateSeparatorContainer}>
            <View style={styles.dateSeparatorBubble}>
                <Text style={styles.dateSeparatorText}>{dayLabel}</Text>
            </View>
        </View>
    );
});

// Floating scroll-to-bottom button with circular progress and unread badge
export const ScrollToBottomButton = React.memo(function ScrollToBottomButton({ 
    onPress, unreadCount, scrollPercentage = 0 
}: { 
    onPress: () => void; 
    unreadCount: number;
    scrollPercentage?: number;
}) {
    const size = 52;
    const strokeWidth = 3;
    const center = size / 2;
    const radius = center - strokeWidth;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (scrollPercentage * circumference);

    return (
        <View style={styles.scrollBtnWrapper}>
            <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
                <Svg width={size} height={size} style={{ position: 'absolute' }}>
                    <Circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke="rgba(15, 23, 42, 0.4)" // Dark translucent background ring
                        strokeWidth={strokeWidth}
                        fill="rgba(15, 23, 42, 0.8)" // Inner dark background like image
                    />
                    <Circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke="#0EA5E9" // Bright blue progress ring like image
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${center} ${center})`}
                    />
                </Svg>
                <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.scrollBtnInner}>
                    <Ionicons name="chevron-down" size={28} color="#0EA5E9" />
                </TouchableOpacity>
            </View>
            {unreadCount > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    // System message
    systemContainer: { alignItems: 'center', marginVertical: 10, paddingHorizontal: 20 },
    systemBubble: {
        backgroundColor: 'rgba(246, 133, 55, 0.08)', paddingHorizontal: 16, paddingVertical: 6,
        borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(246, 133, 55, 0.2)',
    },
    systemText: { fontSize: 13, color: '#F68537', fontWeight: '600', textAlign: 'center' },
    systemTime: { fontSize: 10, color: 'rgba(246, 133, 55, 0.6)', textAlign: 'center', marginTop: 2, fontWeight: 'bold' },

    // Date separator
    dateSeparatorContainer: { alignItems: 'center', marginVertical: 20 },
    dateSeparatorBubble: {
        backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
    },
    dateSeparatorText: { fontSize: 11, color: '#6B7280', fontWeight: '800', letterSpacing: 0.5 },

    // Scroll button
    scrollBtnWrapper: { position: 'absolute', bottom: 20, right: 16, zIndex: 9999, elevation: 10 },
    scrollBtnInner: {
        width: 44, height: 44, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
    },
    badge: {
        position: 'absolute', top: -8, right: -6,
        backgroundColor: '#EF4444', borderRadius: 12, minWidth: 24, height: 24,
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
        borderWidth: 2, borderColor: 'white', zIndex: 10000, elevation: 11,
    },
    badgeText: { color: 'white', fontSize: 11, fontWeight: '900' },
});
