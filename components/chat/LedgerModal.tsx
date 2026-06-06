import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDbStore } from '@/store/useDbStore';
import { addLocalExpense, getLocalExpenses, getExpenseBalance, deleteLocalExpense } from '@/lib/localDb';
import * as Haptics from 'expo-haptics';
import { useChatStore } from '@/store/useChatStore';
import { useAuthStore } from '@/store/useAuthStore';

interface LedgerModalProps {
    visible: boolean;
    onClose: () => void;
    friendId: string;
    friendName: string;
}

// ─── Memoized Expense Item ───────────────────────────────────────────────────
const ExpenseItem = memo(({ item, onDelete }: { item: any, onDelete: (id: number) => void }) => {
    const isGave = item.type === 'gave';
    
    const handleDelete = useCallback(() => {
        onDelete(item.id);
    }, [item.id, onDelete]);

    return (
        <View style={styles.expenseItem}>
            <View style={[styles.iconContainer, isGave ? styles.bgGave : styles.bgTook]}>
                <Ionicons
                    name={isGave ? 'arrow-up-outline' : 'arrow-down-outline'}
                    size={18}
                    color={isGave ? '#10B981' : '#EF4444'}
                />
            </View>
            <View style={styles.expenseInfo}>
                <Text style={styles.expenseDesc}>
                    {item.description || (isGave ? 'Paisa Diya' : 'Paisa Liya')}
                </Text>
                <Text style={styles.expenseDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <Text style={[styles.expenseAmount, isGave ? styles.textGave : styles.textTook]}>
                {isGave ? '+' : '-'} ₹{item.amount}
            </Text>
            <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={18} color="#94A3B8" />
            </TouchableOpacity>
        </View>
    );
});

const LedgerModal = memo(({ visible, onClose, friendId, friendName }: LedgerModalProps) => {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [balance, setBalance] = useState(0);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'gave' | 'took'>('gave');

    const loadData = useCallback(async () => {
        try {
            const { db } = useDbStore.getState();
            if (db && friendId) {
                // 1. Load Local first (fast)
                const localData = await getLocalExpenses(db, friendId);
                const bal = await getExpenseBalance(db, friendId);
                setExpenses(localData || []);
                setBalance(bal || 0);

                // 2. Sync with Supabase (Cloud backup)
                const { supabase } = require('@/lib/supabase');
                const { user } = useAuthStore.getState();
                if (user) {
                    const { data: cloudData, error } = await supabase
                        .from('ledger')
                        .select('*')
                        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
                        .order('created_at', { ascending: false });

                    if (cloudData && !error && cloudData.length > 0) {
                        await db.withTransactionAsync(async () => {
                            for (const item of cloudData) {
                                const isMe = item.user_id === user.id;
                                const finalType = isMe ? item.type : (item.type === 'gave' ? 'took' : 'gave');
                                const targetFriendId = isMe ? item.friend_id : item.user_id;
                                
                                await db.runAsync(
                                    `INSERT OR IGNORE INTO expenses (friend_id, amount, description, type, created_at, sync_id) VALUES (?, ?, ?, ?, ?, ?)`,
                                    [targetFriendId, item.amount, item.description, finalType, item.created_at || new Date().toISOString(), item.sync_id]
                                );
                            }
                        });
                        // Re-load local after sync
                        const updatedData = await getLocalExpenses(db, friendId);
                        const updatedBal = await getExpenseBalance(db, friendId);
                        setExpenses(updatedData || []);
                        setBalance(updatedBal || 0);
                    }
                }
            }
        } catch (e) {
            console.warn('[LEDGER] Load/Sync failed:', e);
        }
    }, [friendId]);

    useEffect(() => {
        if (visible) loadData();
    }, [visible, loadData]);

    const handleAdd = useCallback(async () => {
        if (!amount || isNaN(Number(amount))) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }
        try {
            const { db } = useDbStore.getState();
            const { user } = useAuthStore.getState();
            if (db && user) {
                // 1. Save Locally first with a temp sync ID
                const syncId = `ledger-${Date.now()}`;
                await addLocalExpense(db, friendId, Number(amount), description, type, syncId);
                
                // 2. Sync with Friend
                const ledgerData = {
                    amount: Number(amount),
                    description: description || (type === 'gave' ? 'Paisa Diya' : 'Paisa Liya'),
                    type: type, // 'gave' or 'took'
                    syncId: syncId // Pass the same ID to prevent duplicates
                };
                
                const syncMsg = `SYSTEM_LEDGER:${JSON.stringify(ledgerData)}`;
                await useChatStore.getState().sendMessage(syncMsg, friendId, user, false, undefined, 'ledger');

                setAmount('');
                setDescription('');
                
                // Wait for DB to settle
                setTimeout(() => {
                    loadData();
                }, 300);
                
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (e) {
            console.error('[LEDGER] Add error:', e);
            Alert.alert('Error', 'Entry add nahi ho payi. Dobara koshish karein.');
        }
    }, [amount, description, type, friendId, loadData]);

    const handleDelete = useCallback(async (id: number) => {
        try {
            const { db } = useDbStore.getState();
            if (db) {
                await deleteLocalExpense(db, id);
                loadData();
            }
        } catch (e) {
            console.warn('[LEDGER] Delete failed:', e);
        }
    }, [loadData]);

    const setTypeGave = useCallback(() => setType('gave'), []);
    const setTypeTook = useCallback(() => setType('took'), []);

    const renderItem = useCallback(({ item }: { item: any }) => (
        <ExpenseItem item={item} onDelete={handleDelete} />
    ), [handleDelete]);

    const renderEmpty = useCallback(() => (
        <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#E2E8F0" />
            <Text style={styles.emptyText}>No entries yet</Text>
        </View>
    ), []);

    const isBalancePositive = balance >= 0;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.keyboardView}
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
                        <View style={[styles.balanceCard, isBalancePositive ? styles.bgGaveLight : styles.bgTookLight]}>
                            <Text style={styles.balanceLabel}>{isBalancePositive ? 'Lene Hain' : 'Dene Hain'}</Text>
                            <Text style={[styles.balanceAmount, isBalancePositive ? styles.textGave : styles.textTook]}>
                                ₹{Math.abs(balance)}
                            </Text>
                        </View>

                        {/* Add Entry Form */}
                        <View style={styles.form}>
                            <View style={styles.typeSelector}>
                                <TouchableOpacity
                                    onPress={setTypeGave}
                                    style={[styles.typeBtn, type === 'gave' && styles.typeBtnGaveActive]}
                                >
                                    <Text style={[styles.typeText, type === 'gave' && styles.typeTextActive]}>Lene Hain</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={setTypeTook}
                                    style={[styles.typeBtn, type === 'took' && styles.typeBtnTookActive]}
                                >
                                    <Text style={[styles.typeText, type === 'took' && styles.typeTextActive]}>Dene Hain</Text>
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
                        <Text style={styles.historyTitle}>RECENT ENTRIES (HISTORY)</Text>
                        <FlatList
                            data={expenses}
                            keyExtractor={(item) => item.id.toString()}
                            contentContainerStyle={styles.listContent}
                            ListEmptyComponent={renderEmpty}
                            renderItem={renderItem}
                            initialNumToRender={15}
                            maxToRenderPerBatch={10}
                            windowSize={10}
                            removeClippedSubviews={Platform.OS === 'android'}
                        />
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
});

export default LedgerModal;

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
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    historyTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#94A3B8',
        letterSpacing: 1.5,
    },
    countBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        fontSize: 10,
        fontWeight: 'bold',
        color: '#64748B',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        opacity: 0.5,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748B',
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
    modalOverlay: {
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    keyboardView: {
        flex: 1, 
        justifyContent: 'flex-end'
    },
    bgGaveLight: {
        backgroundColor: '#ECFDF5'
    },
    bgTookLight: {
        backgroundColor: '#FEF2F2'
    },
    textGave: {
        color: '#10B981'
    },
    textTook: {
        color: '#EF4444'
    },
    typeBtnGaveActive: {
        backgroundColor: '#F68537'
    },
    typeBtnTookActive: {
        backgroundColor: '#EF4444'
    },
    typeTextActive: {
        color: 'white'
    },
    listContent: {
        paddingBottom: 40
    },
    bgGave: {
        backgroundColor: '#D1FAE5'
    },
    bgTook: {
        backgroundColor: '#FEE2E2'
    },
    expenseInfo: {
        flex: 1, 
        marginLeft: 12
    },
    deleteBtn: {
        marginLeft: 12
    }
});
