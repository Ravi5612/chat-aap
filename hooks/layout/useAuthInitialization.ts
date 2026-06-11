import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useFriendsStore } from '@/store/useFriendsStore';
import { useDbStore } from '@/store/useDbStore';
import { setupDatabase } from '@/lib/database';
import { AppStorage } from '@/lib/storage';
import { initializeX25519Keys } from '@/utils/chatCrypto';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';

export const useAuthInitialization = () => {
    const setSession = useAuthStore(state => state.setSession);
    const setInitializing = useAuthStore(state => state.setInitializing);
    const [bootStatus, setBootStatus] = useState('Starting...');
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    
    const addLog = (msg: string) => {
        setDebugLogs(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${msg}`]);
        setBootStatus(msg);
    };

    useEffect(() => {
        const setupAuth = async () => {
            try {
                setupDatabase();
                await useDbStore.getState().initialize();

                let didFetchCache = false;
                const cachedSessionStr = await AppStorage.getItemAsync('supabase_session').catch(() => null);

                if (cachedSessionStr) {
                    try {
                        const cachedSession = JSON.parse(cachedSessionStr);
                        useAuthStore.setState({ session: cachedSession, user: cachedSession.user });
                        useAuthStore.getState().syncDevice();

                        const { db } = useDbStore.getState();
                        if (db) {
                            const { getLocalConversations, getLocalStatuses, getLocalProfile } = require('@/lib/localDb');
                            const [localConv, localStatuses, localProfile] = await Promise.all([
                                getLocalConversations(db),
                                getLocalStatuses(db),
                                getLocalProfile(db, cachedSession.user.id)
                            ]);
                            
                            if (localProfile) {
                                useAuthStore.setState({ profile: localProfile });
                            }
                            
                            let localStatusInfoMap: Record<string, any> = {};
                            let groupedMyStatus: any = { active: [] };

                            if (localStatuses && localStatuses.length > 0) {
                                const parsedStatuses = localStatuses.map((s: any) => {
                                    try {
                                        if (typeof s.encrypted_keys === 'string') s.encrypted_keys = JSON.parse(s.encrypted_keys);
                                        if (typeof s.mentioned_user_ids === 'string') s.mentioned_user_ids = JSON.parse(s.mentioned_user_ids);
                                    } catch (e) {}
                                    return s;
                                }).filter((s: any) => s.is_deleted !== 1 && s.is_deleted !== true && s.is_deleted !== '1');

                                const userId = cachedSession.user.id;
                                const myLocalStatuses = parsedStatuses.filter((s: any) => s.user_id === userId);
                                const friendLocalStatuses = parsedStatuses.filter((s: any) => s.user_id !== userId);

                                const { processMyStatuses, processStatuses } = require('@/services/friends/statusProcessor');
                                const myProfile = useAuthStore.getState().profile;
                                const mockFriendships = (localConv || []).map((c: any) => ({ friend: c }));

                                const [myStat, friendStat] = await Promise.all([
                                    processMyStatuses(myLocalStatuses, myProfile, userId),
                                    processStatuses(friendLocalStatuses, [], mockFriendships, myProfile, userId, null)
                                ]);
                                groupedMyStatus = myStat;
                                localStatusInfoMap = friendStat;
                            }

                            if (localConv && localConv.length > 0) {
                                const filteredLocalConv = localConv.filter((c: any) => c.id !== cachedSession.user.id);
                                useFriendsStore.setState({ 
                                    combinedItems: filteredLocalConv,
                                    friends: filteredLocalConv.filter((c: any) => c.isFriend),
                                    groups: filteredLocalConv.filter((c: any) => c.isGroup),
                                    lockedChatIds: filteredLocalConv.filter((c: any) => c.isLocked).map((c: any) => c.id),
                                    statusInfo: localStatusInfoMap,
                                    myStatuses: groupedMyStatus,
                                    loading: false
                                });
                            } else if (Object.keys(localStatusInfoMap).length > 0 || groupedMyStatus.active?.length > 0) {
                                useFriendsStore.setState({ statusInfo: localStatusInfoMap, myStatuses: groupedMyStatus });
                            }
                        }

                        // 🔥 FAST BOOT: Hide Splash Screen immediately after local cache is loaded!
                        setInitializing(false);
                        useAuthStore.getState().setInitializing(false);

                        await useAuthStore.getState().syncProfile();
                        await useFriendsStore.getState().fetchBlockedUsers(cachedSession.user.id);
                        didFetchCache = true;
                    } catch (e: any) {
                        console.warn('Error parsing cached session:', e);
                    }
                }

                const { data: { session: liveSession } } = await supabase.auth.getSession();
                setSession(liveSession);
                
                if (liveSession) {
                    const currentUserId = liveSession.user.id;
                    const lastUserId = await AppStorage.getItemAsync('last_user_id').catch(() => null);
                    
                    if (lastUserId && lastUserId !== currentUserId) {
                        const { db } = useDbStore.getState();
                        if (db) {
                            const { clearAllLocalData } = require('@/lib/localDb');
                            await clearAllLocalData(db);
                        }
                    }
                    await AppStorage.setItemAsync('last_user_id', currentUserId).catch(()=>null);

                    if (!didFetchCache || !cachedSessionStr || JSON.parse(cachedSessionStr).user.id !== currentUserId) {
                        await useAuthStore.getState().syncProfile();
                        await useFriendsStore.getState().fetchBlockedUsers(currentUserId);
                    }
                    try {
                        const publicKeyBase64 = await initializeX25519Keys(currentUserId);
                        await supabase.from('profiles').update({ public_key: publicKeyBase64 }).eq('id', currentUserId);
                    } catch(e) { 
                        console.warn('E2EE Init Error (non-fatal):', e);
                    }
                }

            } catch (error: any) {
                console.error('Error getting session:', error);
            } finally {
                setInitializing(false);
                useAuthStore.getState().setInitializing(false);
            }
        };

        setupAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
            setSession(session);
            if (session?.user) {
                useAuthStore.getState().syncDevice();
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);
};
