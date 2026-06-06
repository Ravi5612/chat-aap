import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { decryptText } from '@/utils/chatCrypto';

interface ScheduledMessagesListModalProps {
    visible: boolean;
    onClose: () => void;
    friendId: string;
    isGroup: boolean;
    chatKey: Uint8Array | null;
}

const ScheduledMessageCard = React.memo(({ item, onCancel }: { item: any, onCancel: (id: string) => void }) => {
    const timeString = React.useMemo(() => new Date(item.scheduled_at).toLocaleString(), [item.scheduled_at]);

    return (
        <View style={styles.messageCard}>
            <View style={{ flex: 1 }}>
                <Text style={styles.messageText} numberOfLines={2}>
                    {item.message_type !== 'text' ? `[${item.message_type.toUpperCase()}] ` : ''}
                    {item.message || 'Media'}
                </Text>
                <Text style={styles.timeText}>
                    Scheduled for: {timeString}
                </Text>
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => onCancel(item.id)}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
        </View>
    );
});

export default React.memo(function ScheduledMessagesListModal({ visible, onClose, friendId, isGroup, chatKey }: ScheduledMessagesListModalProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && chatKey) {
            fetchScheduledMessages();
        }
    }, [visible, chatKey]);

    const fetchScheduledMessages = async () => {
        setLoading(true);
        try {
            let query = supabase.from('scheduled_messages').select('*').eq('status', 'pending');
            if (isGroup) {
                query = query.eq('group_id', friendId);
            } else {
                query = query.eq('receiver_id', friendId);
            }
            
            const { data, error } = await query.order('scheduled_at', { ascending: true });
            if (error) throw error;

            if (data) {
                const decrypted = await Promise.all(data.map(async (msg) => {
                    let decryptedMsg = msg.message;
                    try {
                        decryptedMsg = await decryptText(msg.message, chatKey);
                    } catch(e) {
                        console.warn("Failed to decrypt scheduled message", e);
                    }
                    return { ...msg, message: decryptedMsg };
                }));
                setMessages(decrypted);
            }
        } catch (error) {
            console.error("Failed to fetch scheduled messages:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = React.useCallback(async (id: string) => {
        try {
            const { error } = await supabase.from('scheduled_messages').delete().eq('id', id);
            if (error) throw error;
            setMessages(prev => prev.filter(m => m.id !== id));
        } catch (error) {
            console.error("Failed to cancel scheduled message:", error);
            require('react-native').Alert.alert('Error', 'Failed to cancel the message.');
        }
    }, []);

    const renderItem = React.useCallback(({ item }: { item: any }) => (
        <ScheduledMessageCard item={item} onCancel={handleCancel} />
    ), [handleCancel]);

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Scheduled Messages ⏰</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color="#F68537" style={{ marginTop: 20 }} />
                    ) : messages.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-clear-outline" size={48} color="#D1D5DB" />
                            <Text style={styles.emptyText}>No scheduled messages.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={messages}
                            keyExtractor={(item) => item.id}
                            renderItem={renderItem}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, minHeight: '50%', maxHeight: '80%'
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
    closeBtn: { padding: 4, backgroundColor: '#F3F4F6', borderRadius: 20 },
    messageCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB',
        padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6'
    },
    messageText: { fontSize: 15, color: '#374151', marginBottom: 4 },
    timeText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
    cancelBtn: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 12, marginLeft: 12 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
    emptyText: { marginTop: 12, fontSize: 16, color: '#9CA3AF', fontWeight: '500' }
});
