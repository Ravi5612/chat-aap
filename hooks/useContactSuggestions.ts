import { useState, useEffect, useCallback, useRef } from 'react';
import * as Contacts from 'expo-contacts';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { Alert } from 'react-native';
import { getFromCache, saveToCache } from '@/lib/database';

// Memory cache keyed by user ID to prevent cross-user data leaks on logout/login
const memoryCache: Record<string, { data: any[], timestamp: number }> = {};
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

export const useContactSuggestions = () => {
    const { user: currentUser } = useAuthStore();
    const currentUserId = currentUser?.id || '';

    // Initialize state from memory cache if available for this specific user
    const initialCache = memoryCache[currentUserId]?.data || [];
    const [suggestions, setSuggestions] = useState<any[]>(initialCache);
    const [loading, setLoading] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

    const loadSuggestions = useCallback(async (forceRefresh = false) => {
        if (!currentUserId) return;
        
        // 0. Instant SQLite Cache Load
        const localCached = getFromCache('contact_suggestions');
        if (localCached && suggestions.length === 0 && !forceRefresh) {
             setSuggestions(localCached);
        }

        // Use memory cache if it's recent and not forced to refresh
        const userCache = memoryCache[currentUserId];
        if (!forceRefresh && userCache && (Date.now() - userCache.timestamp < CACHE_DURATION)) {
            setSuggestions(userCache.data);
            return;
        }

        // Only show loading if we don't have any local suggestions to show
        if (!localCached) {
            setLoading(true);
        }

        try {
            // Fix: Check permissions first to avoid blind prompt triggers every 5 mins
            const { status: existingStatus } = await Contacts.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status: requestedStatus } = await Contacts.requestPermissionsAsync();
                finalStatus = requestedStatus;
            }
            
            setPermissionGranted(finalStatus === 'granted');

            if (finalStatus !== 'granted') {
                setLoading(false);
                return;
            }

            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.PhoneNumbers],
            });

            if (data.length > 0) {
                // 1. Extract and normalize phone numbers
                const phoneNumbers = new Set<string>();
                
                data.forEach(contact => {
                    if (contact.phoneNumbers) {
                        contact.phoneNumbers.forEach(phone => {
                            let num = phone.number?.replace(/\s+/g, '').replace(/-/g, '').replace(/\(/g, '').replace(/\)/g, '');
                            if (!num) return;
                            
                            // Basic normalization: prevent duplicate array entries to keep Supabase query small
                            if (num.length === 10 && /^\d+$/.test(num)) {
                                phoneNumbers.add(`+91${num}`);
                            } else if (num.startsWith('0') && num.length === 11) {
                                phoneNumbers.add(`+91${num.substring(1)}`);
                            } else if (!num.startsWith('+') && num.length > 10) {
                                phoneNumbers.add(`+${num}`);
                            } else {
                                phoneNumbers.add(num);
                            }
                        });
                    }
                });

                const uniquePhones = Array.from(phoneNumbers);
                if (uniquePhones.length === 0) {
                    setLoading(false);
                    return;
                }

                // Split array into chunks of 100 to avoid overly large queries
                const chunkSize = 100;
                const chunkPromises = [];
                
                for (let i = 0; i < uniquePhones.length; i += chunkSize) {
                    const chunk = uniquePhones.slice(i, i + chunkSize);
                    chunkPromises.push(
                        supabase
                            .from('profiles')
                            .select('id, username, phone, avatar_url, email')
                            .in('phone', chunk)
                            .neq('id', currentUserId)
                    );
                }

                const chunkResults = await Promise.all(chunkPromises);
                let registeredProfiles: any[] = [];
                chunkResults.forEach(({ data, error }) => {
                    if (!error && data) {
                        registeredProfiles = [...registeredProfiles, ...data];
                    }
                });

                if (registeredProfiles.length === 0) {
                    setSuggestions([]);
                    setLoading(false);
                    return;
                }

                const profileIds = registeredProfiles.map(p => p.id);

                // 2. Fetch existing friends (bi-directional) and requests in parallel
                const [friendshipsRes, requestsRes] = await Promise.all([
                    supabase
                        .from('friendships')
                        .select('user_id, friend_id')
                        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`),
                    supabase
                        .from('friend_requests')
                        .select('sender_id, receiver_id, status')
                        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
                ]);

                if (friendshipsRes.error) throw friendshipsRes.error;
                if (requestsRes.error) throw requestsRes.error;

                const friendIds = new Set<string>();

                // Collect ALL friend IDs where I am either user_id or friend_id
                if (friendshipsRes.data) {
                    friendshipsRes.data.forEach((f: any) => {
                        if (f.user_id === currentUserId) friendIds.add(f.friend_id);
                        if (f.friend_id === currentUserId) friendIds.add(f.user_id);
                    });
                }
                
                const sentRequestIds = new Set(requestsRes.data?.filter(r => r.sender_id === currentUserId && r.status !== 'rejected').map(r => r.receiver_id) || []);
                const receivedRequestIds = new Set(requestsRes.data?.filter(r => r.receiver_id === currentUserId && r.status !== 'rejected').map(r => r.sender_id) || []);

                const finalSuggestions = registeredProfiles
                    .filter(p => 
                        !friendIds.has(p.id) && 
                        !receivedRequestIds.has(p.id)
                    )
                    .map(p => ({
                        ...p,
                        requestStatus: sentRequestIds.has(p.id) ? 'pending' : null
                    }));

                memoryCache[currentUserId] = {
                    data: finalSuggestions,
                    timestamp: Date.now()
                };
                
                setSuggestions(finalSuggestions);
                saveToCache('contact_suggestions', finalSuggestions);
            }
        } catch (error) {
            if (__DEV__) console.error("Error loading contact suggestions:", error);
        } finally {
            setLoading(false);
        }
    }, [currentUserId, suggestions.length]);

    useEffect(() => {
        loadSuggestions();
    }, [currentUserId, loadSuggestions]);

    const sendRequest = useCallback(async (receiverId: string) => {
        if (!currentUserId || !currentUser) return;
        
        try {
            // Profile verification is no longer needed via extra Supabase round-trip,
            // we already have the local session Profile in useAuthStore.
            const senderProfile = useAuthStore.getState().profile;
            
            if (!senderProfile || !senderProfile.username) {
                Alert.alert('Profile Error', 'Your profile details are missing. Please update your profile in settings first.');
                return;
            }

            // 2. Optimistic update UI
            setSuggestions(prev => prev.map(p => 
                p.id === receiverId ? { ...p, requestStatus: 'pending' } : p
            ));

            // 3. Insert friend request
            const { error: requestError } = await supabase
                .from('friend_requests')
                .insert([{
                    sender_id: currentUserId,
                    receiver_id: receiverId,
                    status: 'pending'
                }]);

            if (requestError) {
                if (__DEV__) console.error("Friend request insert error:", requestError);
                // Revert on error
                setSuggestions(prev => prev.map(p => 
                    p.id === receiverId ? { ...p, requestStatus: null } : p
                ));
                throw new Error(requestError.message);
            }

            // 4. Send Notification (ignore errors here to not block the main flow)
            try {
                await supabase.from('notifications').insert([{
                    user_id: receiverId,
                    sender_id: currentUserId,
                    type: 'friend_request',
                    message: `${senderProfile.username || 'A contact'} sent you a friend request.`,
                    is_read: false
                }]);
            } catch (notifErr) {
                if (__DEV__) console.warn("Notification failed to send:", notifErr);
            }

        } catch (error: any) {
            if (__DEV__) console.error("Overall sendRequest error:", error);
            Alert.alert('Error', 'Failed to send friend request. ' + error.message);
        }
    }, [currentUser, currentUserId]);

    return {
        suggestions,
        loading,
        permissionGranted,
        loadSuggestions,
        sendRequest
    };
};
