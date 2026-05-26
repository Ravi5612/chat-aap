import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useFriendsStore } from '@/store/useFriendsStore';
import { useNotifications } from '@/hooks/useNotifications';
import { useGlobalRealtime } from '@/hooks/useGlobalRealtime';
import { useCallManager } from '@/hooks/useCallManager';
import { useInitialPermissions } from '@/hooks/useInitialPermissions';
import CallScreen from '@/components/chat/CallScreen';
import { useCallStore } from '@/store/useCallStore';
import { TouchableOpacity, Text, View, StatusBar, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import { useNotificationStore } from '@/store/useNotificationStore';
import { useDbStore } from '@/store/useDbStore';
import InAppNotification from '@/components/ui/InAppNotification';
import { supabase } from '@/lib/supabase';
import { batchMarkMessageDeliveredLocally } from '@/lib/localDb';

const syncAllPendingDeliveredReceiptsGlobal = async (myUserId: string) => {
    try {
        const { db } = useDbStore.getState();
        if (!db) {
            if (__DEV__) console.log('[DELIVERED] DB not initialized yet for sync');
            return;
        }

        // 1. Get messages received by me that are still marked as 'sent'
        const { data: pending, error: fetchError } = await supabase
            .from('messages')
            .select('id')
            .eq('receiver_id', myUserId)
            .eq('status', 'sent')
            .limit(500); // Limit to 500 to prevent memory spikes

        if (fetchError) throw fetchError;
        if (!pending || pending.length === 0) return;

        if (__DEV__) console.log(`[DELIVERED] Found ${pending.length} pending sent messages to mark as delivered globally`);

        const ids = pending.map(m => m.id);

        // 2. Mark them as delivered in local SQLite DB in batch
        await batchMarkMessageDeliveredLocally(db, ids);

        // 3. Batch update Supabase to 'delivered'
        const { error: updateError } = await supabase
            .from('messages')
            .update({ status: 'delivered' })
            .in('id', ids);

        if (updateError) throw updateError;
        if (__DEV__) console.log(`[DELIVERED] Batch updated ${ids.length} messages successfully`);
    } catch (e) {
        if (__DEV__) console.warn('[DELIVERED] Global sync failed:', e);
    }
};

export const BackgroundServices = () => {
    const session = useAuthStore(state => state.session);
    const combinedItems = useFriendsStore(state => state.combinedItems);
    const { currentNotification, clearNotification } = useNotificationStore();
    const initializeDb = useDbStore(state => state.initialize);

    // Remove redundant initializeDb call here, it's already handled in _layout.tsx

    // Sync all pending delivered receipts when user logs in/opens the app
    useEffect(() => {
        if (session?.user?.id) {
            syncAllPendingDeliveredReceiptsGlobal(session.user.id);
        }
    }, [session?.user?.id]);

    // Listen to AppState transitions to sync when app comes to foreground (active)
    useEffect(() => {
        if (!session?.user?.id) return;

        let lastSyncTime = 0;

        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                const now = Date.now();
                if (now - lastSyncTime > 10000) { // Debounce for 10 seconds
                    lastSyncTime = now;
                    syncAllPendingDeliveredReceiptsGlobal(session.user.id);
                }
            }
        });

        return () => {
            subscription.remove();
        };
    }, [session?.user?.id]);
    
    // 1. Permissions
    useInitialPermissions();

    // 2. Global Services
    useNotifications(session?.user?.id || null);
    useGlobalRealtime(session?.user?.id || null);

    // 3. Call Management
    const memoizedFriends = React.useMemo(() => combinedItems || [], [combinedItems]);
    const profile = useAuthStore(state => state.profile);
    const { 
        callSession, 
        setCallActive, 
        endCall,
        handleStartCall
    } = useCallManager(session?.user, memoizedFriends, true, profile);
    
    const { isMinimized, setMinimized } = useCallStore();

    if (!session?.user) return null;

    return (
        <>
            <InAppNotification 
                notification={currentNotification} 
                onClose={clearNotification} 
            />
            <CallScreen
                visible={!!callSession && !isMinimized}
                callState={callSession?.status}
                onEndCall={endCall}
                onAcceptCall={setCallActive}
                onMinimize={() => setMinimized(true)}
                onRetry={() => {
                    if (callSession?.friend && callSession?.type) {
                        // Restart the call using previous call's info
                        handleStartCall(callSession.friend, callSession.type, callSession.isGroup || false);
                    }
                }}
                currentUser={session?.user}
                callType={callSession?.type || 'video'}
                friend={callSession?.friend || {}}
                offer={callSession?.offer}
                isGroup={callSession?.isGroup}
            />
            {isMinimized && callSession && callSession.status !== 'ended' && (
                <>
                    <TouchableOpacity 
                        onPress={() => setMinimized(false)}
                        activeOpacity={0.9}
                        style={{
                            position: 'absolute',
                            top: Constants.statusBarHeight || 40,
                            left: 0,
                            right: 0,
                            height: 40,
                            backgroundColor: '#10B981', // Sleek WhatsApp-like green
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            elevation: 5,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 3,
                            zIndex: 9999,
                        }}
                    >
                        <Ionicons name="call" size={14} color="white" style={{ marginRight: 8 }} />
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13, letterSpacing: 0.5 }}>
                            Tap to return to call
                        </Text>
                    </TouchableOpacity>
                </>
            )}
        </>
    );
};
