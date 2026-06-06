import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ScheduleMessageModalProps {
    visible: boolean;
    onClose: () => void;
    onSchedule: (date: Date) => void;
}

const HOURS_DATA = Array.from({length: 24}, (_, i) => i);
const MINUTES_DATA = [0, 15, 30, 45];
const DAYS_DATA = ['Today', 'Tomorrow'];

const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formatted = h % 12 || 12;
    return `${formatted} ${ampm}`;
};

export default React.memo(function ScheduleMessageModal({ visible, onClose, onSchedule }: ScheduleMessageModalProps) {
    const [selectedDay, setSelectedDay] = React.useState(0); // 0 = Today, 1 = Tomorrow
    const [selectedHour, setSelectedHour] = React.useState(new Date().getHours() + 1);
    const [selectedMinute, setSelectedMinute] = React.useState(0);

    const handleSchedule = React.useCallback(() => {
        const d = new Date();
        d.setDate(d.getDate() + selectedDay);
        d.setHours(selectedHour, selectedMinute, 0, 0);
        
        // Prevent scheduling in the past
        if (d.getTime() <= Date.now()) {
            require('react-native').Alert.alert('Invalid Time', 'Please select a future time.');
            return;
        }
        onSchedule(d);
        onClose();
    }, [selectedDay, selectedHour, selectedMinute, onSchedule, onClose]);

    const renderHourItem = React.useCallback(({item}: any) => (
        <TouchableOpacity
            style={[styles.timeBtn, selectedHour === item && styles.timeBtnActive]}
            onPress={() => setSelectedHour(item)}
        >
            <Text style={[styles.timeText, selectedHour === item && styles.timeTextActive]}>
                {formatHour(item)}
            </Text>
        </TouchableOpacity>
    ), [selectedHour]);

    const renderMinuteItem = React.useCallback(({item}: any) => (
        <TouchableOpacity
            style={[styles.timeBtn, selectedMinute === item && styles.timeBtnActive]}
            onPress={() => setSelectedMinute(item)}
        >
            <Text style={[styles.timeText, selectedMinute === item && styles.timeTextActive]}>
                {item.toString().padStart(2, '0')}
            </Text>
        </TouchableOpacity>
    ), [selectedMinute]);

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Schedule Message ⏰</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Select Day</Text>
                    <View style={styles.row}>
                        {DAYS_DATA.map((day, index) => (
                            <TouchableOpacity
                                key={day}
                                style={[styles.choiceBtn, selectedDay === index && styles.choiceActive]}
                                onPress={() => setSelectedDay(index)}
                            >
                                <Text style={[styles.choiceText, selectedDay === index && styles.choiceTextActive]}>{day}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.subtitle}>Select Hour</Text>
                    <View style={styles.pickerContainer}>
                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={HOURS_DATA}
                            keyExtractor={item => item.toString()}
                            renderItem={renderHourItem}
                        />
                    </View>

                    <Text style={styles.subtitle}>Select Minute</Text>
                    <View style={styles.pickerContainer}>
                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={MINUTES_DATA}
                            keyExtractor={item => item.toString()}
                            renderItem={renderMinuteItem}
                        />
                    </View>

                    <TouchableOpacity style={styles.saveBtn} onPress={handleSchedule}>
                        <Text style={styles.saveBtnText}>Schedule Message</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center', alignItems: 'center', padding: 20
    },
    modalContent: {
        backgroundColor: 'white', borderRadius: 24, padding: 24, width: '100%',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, shadowRadius: 12, elevation: 8
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
    closeBtn: { padding: 4, backgroundColor: '#F3F4F6', borderRadius: 20 },
    subtitle: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginTop: 12, marginBottom: 8 },
    row: { flexDirection: 'row', gap: 12 },
    choiceBtn: {
        flex: 1, paddingVertical: 12, alignItems: 'center',
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12
    },
    choiceActive: { backgroundColor: '#FFF7ED', borderColor: '#F68537' },
    choiceText: { fontSize: 15, fontWeight: '600', color: '#4B5563' },
    choiceTextActive: { color: '#F68537' },
    pickerContainer: { marginBottom: 8 },
    timeBtn: {
        paddingHorizontal: 16, paddingVertical: 10,
        marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12
    },
    timeBtnActive: { backgroundColor: '#F68537', borderColor: '#F68537' },
    timeText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
    timeTextActive: { color: 'white' },
    saveBtn: {
        backgroundColor: '#F68537', paddingVertical: 16, borderRadius: 16,
        alignItems: 'center', marginTop: 24
    },
    saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
