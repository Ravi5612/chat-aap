import React from 'react';
import { View, Text, Modal, TouchableOpacity, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface MessageInfoModalProps {
    visible: boolean;
    onClose: () => void;
    message: any;
}

const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};

export default function MessageInfoModal({ visible, onClose, message }: MessageInfoModalProps) {
    if (!visible || !message) return null;

    const sentTime = formatDate(message.created_at);
    const deliveredTime = formatDate(message.delivered_at);
    
    // Check both read_at and is_read fallback
    let readTime = formatDate(message.read_at);
    if (!readTime && message.is_read) {
        readTime = 'Read (Time not recorded)';
    }

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <BlurView intensity={80} tint="light" style={styles.container}>
                            <View style={styles.header}>
                                <Text style={styles.title}>Message Info</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                    <Ionicons name="close" size={24} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.infoList}>
                                {/* Sent */}
                                <View style={styles.infoRow}>
                                    <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                                        <Ionicons name="checkmark" size={20} color="#3B82F6" />
                                    </View>
                                    <View style={styles.textContainer}>
                                        <Text style={styles.label}>Sent</Text>
                                        <Text style={styles.time}>{sentTime || 'Sending...'}</Text>
                                    </View>
                                </View>

                                {/* Delivered */}
                                <View style={styles.infoRow}>
                                    <View style={[styles.iconBox, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                                        <Ionicons name="checkmark-done" size={20} color="#6366F1" />
                                    </View>
                                    <View style={styles.textContainer}>
                                        <Text style={styles.label}>Delivered</Text>
                                        <Text style={styles.time}>{deliveredTime || (message.status === 'delivered' || message.status === 'read' ? 'Delivered' : 'Not delivered yet')}</Text>
                                    </View>
                                </View>

                                {/* Read */}
                                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                                    <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                        <Ionicons name="checkmark-done" size={20} color="#10B981" />
                                    </View>
                                    <View style={styles.textContainer}>
                                        <Text style={styles.label}>Read</Text>
                                        <Text style={[styles.time, !message.is_read && { color: '#94A3B8', fontStyle: 'italic' }]}>
                                            {readTime || 'Not read yet'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </BlurView>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    container: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)'
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B'
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center'
    },
    infoList: {
        padding: 8
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.03)'
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16
    },
    textContainer: {
        flex: 1
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 2
    },
    time: {
        fontSize: 13,
        color: '#64748B'
    }
});
