import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

// Floating scroll-to-bottom button with unread badge
export const ScrollToBottomButton = React.memo(function ScrollToBottomButton({ onPress, unreadCount }: { onPress: () => void; unreadCount: number }) {
    return (
        <View style={styles.scrollBtnWrapper}>
            <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.scrollBtn}>
                <Ionicons name="chevron-down" size={26} color="#F68537" />
            </TouchableOpacity>
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
    scrollBtn: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: 'white',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5,
        elevation: 10, borderWidth: 1, borderColor: '#E5E7EB',
    },
    badge: {
        position: 'absolute', top: -8, right: -6,
        backgroundColor: '#EF4444', borderRadius: 12, minWidth: 24, height: 24,
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
        borderWidth: 2, borderColor: 'white', zIndex: 10000, elevation: 11,
    },
    badgeText: { color: 'white', fontSize: 11, fontWeight: '900' },
});
