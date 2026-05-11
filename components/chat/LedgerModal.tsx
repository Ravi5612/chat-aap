import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDbStore } from '@/store/useDbStore';
import { addLocalExpense, getLocalExpenses, getExpenseBalance, deleteLocalExpense } from '@/lib/localDb';
import * as Haptics from 'expo-haptics';

interface LedgerModalProps {
    visible: boolean;
    onClose: () => void;
    friendId: string;
    friendName: string;
}

export default function LedgerModal({ visible, onClose, friendId, friendName }: LedgerModalProps) {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [balance, setBalance] = useState(0);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'gave' | 'took'>('gave');

    const loadData = async () => {
        try {
            const { db } = useDbStore.getState();
            if (db && friendId) {
                const data = await getLocalExpenses(db, friendId);
                const bal = await getExpenseBalance(db, friendId);
                setExpenses(data || []);
                setBalance(bal || 0);
            }
        } catch (e) {
            console.warn('[LEDGER] Load failed:', e);
        }
    };

    useEffect(() => {
        if (visible) loadData();
    }, [visible, friendId]);

    const handleAdd = async () => {
        if (!amount || isNaN(Number(amount))) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }
        try {
            const { db } = useDbStore.getState();
            if (db) {
                await addLocalExpense(db, friendId, Number(amount), description, type);
                setAmount('');
                setDescription('');
                loadData();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (e) {
            console.warn('[LEDGER] Add failed:', e);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const { db } = useDbStore.getState();
            if (db) {
                await deleteLocalExpense(db, id);
                loadData();
            }
        } catch (e) {
            console.warn('[LEDGER] Delete failed:', e);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1, justifyContent: 'flex-end' }}
                >
                    <View style={styles.container}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.title}>Hisab-Kitab 💸</Text>
                                <Text style={styles.subtitle}>with {friendName}</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {/* Balance Summary */}
                        <View style={[styles.balanceCard, { backgroundColor: balance >= 0 ? '#ECFDF5' : '#FEF2F2' }]}>
                            <Text style={styles.balanceLabel}>{balance >= 0 ? 'Lene Hain' : 'Dene Hain'}</Text>
                            <Text style={[styles.balanceAmount, { color: balance >= 0 ? '#10B981' : '#EF4444' }]}>
                                ₹{Math.abs(balance)}
                            </Text>
                        </View>

                        {/* Add Entry Form */}
                        <View style={styles.form}>
                            <View style={styles.typeSelector}>
                                <TouchableOpacity
                                    onPress={() => setType('gave')}
                                    style={[styles.typeBtn, type === 'gave' && { backgroundColor: '#F68537' }]}
                                >
                                    <Text style={[styles.typeText, type === 'gave' && { color: 'white' }]}>Lene Hain</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setType('took')}
                                    style={[styles.typeBtn, type === 'took' && { backgroundColor: '#EF4444' }]}
                                >
                                    <Text style={[styles.typeText, type === 'took' && { color: 'white' }]}>Dene Hain</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputRow}>
                                <TextInput
                                    style={styles.amountInput}
                                    placeholder="₹ 0"
                                    keyboardType="numeric"
                                    value={amount}
                                    onChangeText={setAmount}
                                />
                                <TextInput
                                    style={styles.descInput}
                                    placeholder="Description (Pizza, Rent...)"
                                    value={description}
                                    onChangeText={setDescription}
                                />
                                <TouchableOpacity onPress={handleAdd} style={styles.addBtn}>
                                    <Ionicons name="add" size={28} color="white" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* History List */}
                        <Text style={styles.historyTitle}>RECENT ENTRIES</Text>
                        <FlatList
                            data={expenses}
                            keyExtractor={(item) => item.id.toString()}
                            contentContainerStyle={{ paddingBottom: 40 }}
                            renderItem={({ item }) => (
                                <View style={styles.expenseItem}>
                                    <View style={[styles.iconContainer, { backgroundColor: item.type === 'gave' ? '#D1FAE5' : '#FEE2E2' }]}>
                                        <Ionicons
                                            name={item.type === 'gave' ? 'arrow-up-outline' : 'arrow-down-outline'}
                                            size={18}
                                            color={item.type === 'gave' ? '#10B981' : '#EF4444'}
                                        />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.expenseDesc}>
                                            {item.description || (item.type === 'gave' ? 'Paisa Diya' : 'Paisa Liya')}
                                        </Text>
                                        <Text style={styles.expenseDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                                    </View>
                                    <Text style={[styles.expenseAmount, { color: item.type === 'gave' ? '#10B981' : '#EF4444' }]}>
                                        {item.type === 'gave' ? '+' : '-'} ₹{item.amount}
                                    </Text>
                                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ marginLeft: 12 }}>
                                        <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        />
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: '80%',
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1F2937',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 2,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    balanceCard: {
        padding: 20,
        borderRadius: 24,
        alignItems: 'center',
        marginBottom: 24,
    },
    balanceLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    balanceAmount: {
        fontSize: 32,
        fontWeight: '900',
        marginTop: 4,
    },
    form: {
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 24,
        marginBottom: 24,
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    typeBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#E2E8F0',
    },
    typeText: {
        fontWeight: 'bold',
        fontSize: 13,
        color: '#64748B',
    },
    inputRow: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    amountInput: {
        width: 80,
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 12,
        fontSize: 16,
        fontWeight: 'bold',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    descInput: {
        flex: 1,
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 12,
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    addBtn: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#F68537',
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#94A3B8',
        letterSpacing: 1.5,
        marginBottom: 16,
    },
    expenseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    expenseDesc: {
        fontSize: 15,
        fontWeight: '600',
        color: '#334155',
    },
    expenseDate: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    expenseAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});
