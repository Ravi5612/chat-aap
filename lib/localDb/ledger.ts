import * as SQLite from 'expo-sqlite';

export const addLocalExpense = async (db: SQLite.SQLiteDatabase, friendId: string, amount: number, description: string, type: 'gave' | 'took', syncId?: string) => {
    try {
        // Try with sync_id first (deduplication)
        await db.runAsync(
            `INSERT OR IGNORE INTO expenses (friend_id, amount, description, type, created_at, sync_id) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [friendId, amount, description, type, new Date().toISOString(), syncId || null]
        );
        console.log(`[LEDGER] Added with syncId: ${syncId}`);
    } catch (error) {
        console.warn('[LEDGER] Insert with sync_id failed, trying fallback...', error);
        try {
            // Fallback: Save without sync_id constraint if something is wrong
            await db.runAsync(
                `INSERT INTO expenses (friend_id, amount, description, type, created_at) VALUES (?, ?, ?, ?, ?)`,
                [friendId, amount, description, type, new Date().toISOString()]
            );
            console.log('[LEDGER] Added with fallback (no syncId)');
        } catch (innerError) {
            console.error('[LEDGER] Critical failure adding expense:', innerError);
        }
    }

    // Push to Supabase Cloud
    try {
        const { supabase } = require('../supabase');
        const { useAuthStore } = require('@/store/useAuthStore');
        const user = useAuthStore.getState().user;
        
        if (user) {
            await supabase.from('ledger').upsert({
                user_id: user.id,
                friend_id: friendId,
                amount: amount,
                description: description,
                type: type,
                sync_id: syncId || `legacy-${Date.now()}`
            });
            console.log('[LEDGER] Pushed to Supabase');
        }
    } catch (e) {
        console.warn('[LEDGER] Supabase sync skipped/failed:', e);
    }
};

export const syncLedgerExpense = async (db: SQLite.SQLiteDatabase, msg: any, currentUserId: string) => {
    if (msg.message_type !== 'ledger' || !msg.message?.startsWith('SYSTEM_LEDGER:')) return;

    try {
        const rawData = msg.message.replace('SYSTEM_LEDGER:', '');
        const ledgerData = JSON.parse(rawData);
        
        // Ensure IDs are strings and lowercased for safe comparison
        const senderId = msg.sender_id?.toString().toLowerCase();
        const myId = currentUserId?.toString().toLowerCase();
        
        const isMe = senderId === myId;
        const friendId = isMe ? msg.receiver_id : msg.sender_id;
        
        // Flip type ONLY if we are the receiver
        let finalType = ledgerData.type;
        if (!isMe) {
            finalType = ledgerData.type === 'gave' ? 'took' : 'gave';
        }
        
        const syncId = ledgerData.syncId || msg.id;

        if (friendId) {
            await addLocalExpense(
                db, 
                friendId, 
                ledgerData.amount, 
                ledgerData.description, 
                finalType,
                syncId
            );
            console.log(`[LEDGER] Sync processed. FinalType: ${finalType}, isMe: ${isMe}, friendId: ${friendId}`);
        }
    } catch (e) {
        console.error('[LEDGER] Sync failed:', e);
    }
};

export const getLocalExpenses = async (db: SQLite.SQLiteDatabase, friendId: string) => {
    try {
        return await db.getAllAsync<any>('SELECT * FROM expenses WHERE friend_id = ? ORDER BY created_at DESC', [friendId]);
    } catch (error) {
        console.error('[ERROR] Failed to get expenses:', error);
        return [];
    }
};

export const getExpenseBalance = async (db: SQLite.SQLiteDatabase, friendId: string) => {
    try {
        const rows = await db.getAllAsync<any>('SELECT amount, type FROM expenses WHERE friend_id = ?', [friendId]);
        let total = 0;
        rows.forEach(row => {
            if (row.type === 'gave') total += row.amount; // Lene hain
            else total -= row.amount; // Dene hain
        });
        return total;
    } catch (error) {
        console.error('[ERROR] Failed to calculate balance:', error);
        return 0;
    }
};

export const deleteLocalExpense = async (db: SQLite.SQLiteDatabase, id: number) => {
    try {
        await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
    } catch (error) {
        console.error('[ERROR] Failed to delete expense:', error);
    }
};
