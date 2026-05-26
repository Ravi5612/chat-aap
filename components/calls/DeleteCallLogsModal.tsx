import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DeleteCallLogsModalProps {
    visible: boolean;
    isDeleting: boolean;
    selectedCount: number;
    onCancel: () => void;
    onDelete: () => void;
}

export default function DeleteCallLogsModal({
    visible,
    isDeleting,
    selectedCount,
    onCancel,
    onDelete,
}: DeleteCallLogsModalProps) {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="trash" size={40} color="#EF4444" />
                    </View>
                    <Text style={styles.modalTitle}>Delete Call Logs?</Text>
                    <Text style={styles.modalMessage}>
                        Are you sure you want to delete {selectedCount} selected call log record{selectedCount > 1 ? 's' : ''}? This action cannot be undone.
                    </Text>
                    
                    <View style={styles.modalButtons}>
                        <TouchableOpacity 
                            style={[styles.modalButton, styles.cancelButton]} 
                            onPress={onCancel}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.modalButton, styles.deleteButton, isDeleting && { opacity: 0.7 }]} 
                            onPress={onDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Text style={styles.deleteButtonText}>Delete</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    modalContainer: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8
    },
    modalMessage: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%'
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center'
    },
    cancelButton: {
        backgroundColor: '#F3F4F6'
    },
    cancelButtonText: {
        color: '#4B5563',
        fontWeight: '600',
        fontSize: 16
    },
    deleteButton: {
        backgroundColor: '#EF4444'
    },
    deleteButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    }
});
