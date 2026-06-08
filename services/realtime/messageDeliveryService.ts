import { supabase } from '@/lib/supabase';

// Queue for batching Supabase 'delivered' updates
let deliveredUpdateQueue: string[] = [];
let deliveredUpdateTimer: NodeJS.Timeout | null = null;

export const queueDeliveredUpdate = (messageId: string) => {
    deliveredUpdateQueue.push(messageId);
    if (deliveredUpdateTimer) clearTimeout(deliveredUpdateTimer);
    
    deliveredUpdateTimer = setTimeout(async () => {
        if (deliveredUpdateQueue.length === 0) return;
        const idsToUpdate = [...deliveredUpdateQueue];
        deliveredUpdateQueue = [];
        
        try {
            const { error } = await supabase
                .from('messages')
                .update({ status: 'delivered' })
                .in('id', idsToUpdate);
            
            if (error) throw error;
            if (__DEV__) console.log(`[DELIVERED] Batch updated ${idsToUpdate.length} messages in GlobalRealtime`);
        } catch (e) {
            if (__DEV__) console.warn('[DELIVERED] Batch update failed in GlobalRealtime:', e);
        }
    }, 1500); // Debounce for 1.5 seconds
};
