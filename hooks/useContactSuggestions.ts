import { useState, useEffect } from 'react';
import * as Contacts from 'expo-contacts';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { Alert } from 'react-native';

// Module-level cache to prevent re-fetching on tab switches
let cachedSuggestions: any[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

export const useContactSuggestions = () => {
    const { user: currentUser } = useAuthStore();
    const [suggestions, setSuggestions] = useState<any[]>(cachedSuggestions || []);
    const [loading, setLoading] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

    const loadSuggestions = async (forceRefresh = false) => {
        if (!currentUser?.id) return;
        
        // 0. Instant SQLite Cache Load
        const localCached = require('@/lib/database').getFromCache('contact_suggestions');
        if (localCached && suggestions.length === 0 && !forceRefresh) {
             setSuggestions(localCached);
        }

        // Use memory cache if it's recent and not forced to refresh
        if (!forceRefresh && cachedSuggestions && (Date.now() - lastFetchTime < CACHE_DURATION)) {
            setSuggestions(cachedSuggestions);
            return;
        }

        // Only show loading if we don't have any local suggestions to show
        if (!localCached) {
            setLoading(true);
        }

        try {
            const { status } = await Contacts.requestPermissionsAsync();
            setPermissionGranted(status === 'granted');

            if (status !== 'granted') {
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
                            
                            // Basic normalization for India and robust matching
                            if (num.length === 10 && /^\d+$/.test(num)) {
                                phoneNumbers.add(`+91${num}`);
                                phoneNumbers.add(num);
                            } else if (num.startsWith('0') && num.length === 11) {
                                phoneNumbers.add(`+91${num.substring(1)}`);
                                phoneNumbers.add(num.substring(1));
                            } else if (!num.startsWith('+') && num.length > 10) {
                                phoneNumbers.add(`+${num}`);
                                phoneNumbers.add(num);
                            } else if (num.startsWith('+91') && num.length === 13) {
                                phoneNumbers.add(num);
                                phoneNumbers.add(num.substring(3));
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
                            .neq('id', currentUser.id)
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
                const [friendsRes, sentRequestsRes, receivedRequestsRes] = await Promise.all([
                    supabase
                        .from('friendships')
                        .select('user_id, friend_id')
                        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`),
                    supabase
                        .from('friend_requests')
                        .select('receiver_id')
                        .eq('sender_id', currentUser.id)
                        .in('receiver_id', profileIds)
                        .in('status', ['pending', 'accepted']),
                    supabase
                        .from('friend_requests')
                        .select('sender_id')
                        .eq('receiver_id', currentUser.id)
                        .in('sender_id', profileIds)
                        .in('status', ['pending', 'accepted'])
                ]);

                // Collect ALL friend IDs where I am either user_id or friend_id
                const friendIds = new Set<string>();
                friendsRes.data?.forEach(f => {
                    if (f.user_id === currentUser.id) friendIds.add(f.friend_id);
                    else friendIds.add(f.user_id);
                });
                
                const sentRequestIds = new Set(sentRequestsRes.data?.map(r => r.receiver_id) || []);
                const receivedRequestIds = new Set(receivedRequestsRes.data?.map(r => r.sender_id) || []);

                const finalSuggestions = registeredProfiles
                    .filter(p => 
                        !friendIds.has(p.id) && 
                        !receivedRequestIds.has(p.id)
                    )
                    .map(p => ({
                        ...p,
                        requestStatus: sentRequestIds.has(p.id) ? 'pending' : null
                    }));

                cachedSuggestions = finalSuggestions;
                lastFetchTime = Date.now();
                setSuggestions(finalSuggestions);
                require('@/lib/database').saveToCache('contact_suggestions', finalSuggestions);
            }
        } catch (error) {
            console.error("Error loading contact suggestions:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSuggestions();
    }, [currentUser]);

    const sendRequest = async (receiverId: string) => {
        if (!currentUser?.id) return;
        
        try {
            // 1. Verify sender profile exists first (Safety check)
            const { data: senderProfile, error: profileError } = await supabase
                .from('profiles')
                .select('id, username')
                .eq('id', currentUser.id)
                .single();

            if (profileError || !senderProfile) {
                console.error("Sender profile not found in database:", profileError);
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
                    sender_id: currentUser.id,
                    receiver_id: receiverId,
                    status: 'pending'
                }]);

            if (requestError) {
                console.error("Friend request insert error:", requestError);
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
                    sender_id: currentUser.id,
                    type: 'friend_request',
                    message: `${senderProfile.username || 'A contact'} sent you a friend request.`,
                    is_read: false
                }]);
            } catch (notifErr) {
                console.warn("Notification failed to send:", notifErr);
            }

        } catch (error: any) {
            console.error("Overall sendRequest error:", error);
            Alert.alert('Error', 'Failed to send friend request. ' + error.message);
        }
    };

    return {
        suggestions,
        loading,
        permissionGranted,
        loadSuggestions,
        sendRequest
    };
};
