import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DisappearingMessagesModalProps {
    visible: boolean;
    onClose: () => void;
    currentDuration: number;
    onSelectDuration: (duration: number) => void;
}

const OPTIONS = [
    { label: 'Off', duration: 0, icon: 'close-circle-outline' },
    { label: '24 Hours', duration: 86400, icon: 'time-outline' },
    { label: '7 Days', duration: 604800, icon: 'calendar-outline' },
    { label: '30 Days', duration: 2592000, icon: 'calendar-clear-outline' }
];

// ─── DurationOption Sub-component ─────────────────────────────────────────────
const DurationOption = memo(({ option, isSelected, onPress, onClose }: any) => {
    const handlePress = useCallback(() => {
        onPress(option.duration);
        onClose();
    }, [option.duration, onPress, onClose]);

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={[
                styles.optionBtn,
                isSelected && styles.optionBtnSelected
            ]}
        >
            <View style={styles.optionLeft}>
                <Ionicons 
                    name={option.icon as any} 
                    size={24} 
                    color={isSelected ? '#F68537' : '#64748B'} 
                />
                <Text style={[
                    styles.optionLabel,
                    isSelected && styles.optionLabelSelected
                ]}>
                    {option.label}
                </Text>
            </View>
            {isSelected && (
                <Ionicons name="checkmark-circle" size={24} color="#F68537" />
            )}
        </TouchableOpacity>
    );
});

// ─── Main Modal Component ─────────────────────────────────────────────────────
const DisappearingMessagesModal = memo(({
    visible,
    onClose,
    currentDuration,
    onSelectDuration
}: DisappearingMessagesModalProps) => {
    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.modalCard}>
                            <View style={styles.header}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="timer" size={24} color="#F59E0B" />
                                </View>
                                <View style={styles.headerTextContainer}>
                                    <Text style={styles.title}>Disappearing Messages</Text>
                                    <Text style={styles.subtitle}>Make new messages in this chat disappear.</Text>
                                </View>
                            </View>

                            <View style={styles.optionsContainer}>
                                {OPTIONS.map(option => (
                                    <DurationOption
                                        key={option.duration}
                                        option={option}
                                        isSelected={currentDuration === option.duration}
                                        onPress={onSelectDuration}
                                        onClose={onClose}
                                    />
                                ))}
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
});

export default DisappearingMessagesModal;

const styles = StyleSheet.create({
    overlay: {
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        justifyContent: 'center', 
        alignItems: 'center',
    },
    modalCard: {
        backgroundColor: 'white', 
        borderRadius: 24, 
        width: '85%', 
        padding: 24, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 10, 
        elevation: 5,
    },
    header: {
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 20,
    },
    iconCircle: {
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        backgroundColor: '#FEF08A', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginRight: 12,
    },
    headerTextContainer: {
        flex: 1,
    },
    title: {
        fontSize: 18, 
        fontWeight: 'bold', 
        color: '#1E293B',
    },
    subtitle: {
        fontSize: 12, 
        color: '#64748B', 
        marginTop: 2,
    },
    optionsContainer: {
        gap: 12,
    },
    optionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#F1F5F9',
        backgroundColor: 'white',
    },
    optionBtnSelected: {
        borderColor: '#F68537',
        backgroundColor: '#FFF7ED',
    },
    optionLeft: {
        flexDirection: 'row', 
        alignItems: 'center',
    },
    optionLabel: {
        marginLeft: 12, 
        fontSize: 16, 
        fontWeight: '600', 
        color: '#334155',
    },
    optionLabelSelected: {
        fontWeight: 'bold', 
        color: '#F68537',
    },
});
