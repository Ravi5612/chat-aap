import React from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DisappearingMessagesModalProps {
    visible: boolean;
    onClose: () => void;
    currentDuration: number;
    onSelectDuration: (duration: number) => void;
}

export default function DisappearingMessagesModal({
    visible,
    onClose,
    currentDuration,
    onSelectDuration
}: DisappearingMessagesModalProps) {
    if (!visible) return null;

    const options = [
        { label: 'Off', duration: 0, icon: 'close-circle-outline' },
        { label: '24 Hours', duration: 86400, icon: 'time-outline' },
        { label: '7 Days', duration: 604800, icon: 'calendar-outline' },
        { label: '30 Days', duration: 2592000, icon: 'calendar-clear-outline' }
    ];

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                    <TouchableWithoutFeedback>
                        <View style={{ backgroundColor: 'white', borderRadius: 24, width: '85%', padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF08A', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                    <Ionicons name="timer" size={24} color="#F59E0B" />
                                </View>
                                <View>
                                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E293B' }}>Disappearing Messages</Text>
                                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Make new messages in this chat disappear.</Text>
                                </View>
                            </View>

                            <View style={{ gap: 12 }}>
                                {options.map(option => (
                                    <TouchableOpacity
                                        key={option.duration}
                                        onPress={() => {
                                            onSelectDuration(option.duration);
                                            onClose();
                                        }}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: 16,
                                            borderRadius: 16,
                                            borderWidth: 2,
                                            borderColor: currentDuration === option.duration ? '#F68537' : '#F1F5F9',
                                            backgroundColor: currentDuration === option.duration ? '#FFF7ED' : 'white'
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Ionicons name={option.icon as any} size={24} color={currentDuration === option.duration ? '#F68537' : '#64748B'} />
                                            <Text style={{ marginLeft: 12, fontSize: 16, fontWeight: currentDuration === option.duration ? 'bold' : '600', color: currentDuration === option.duration ? '#F68537' : '#334155' }}>
                                                {option.label}
                                            </Text>
                                        </View>
                                        {currentDuration === option.duration && (
                                            <Ionicons name="checkmark-circle" size={24} color="#F68537" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
