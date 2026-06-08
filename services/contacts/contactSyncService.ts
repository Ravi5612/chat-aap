import * as Contacts from 'expo-contacts';
import { supabase } from '@/lib/supabase';

export const syncDeviceContacts = async (currentUserId: string) => {
    const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
    });

    if (!data || data.length === 0) {
        return [];
    }

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
        return [];
    }

    // Split array into chunks of 100 to avoid overly large queries
    const chunkSize = 100;
    const chunkPromises = [];
    
    for (let i = 0; i < uniquePhones.length; i += chunkSize) {
        const chunk = uniquePhones.slice(i, i + chunkSize);
        chunkPromises.push(
            supabase
                .from('profiles')
                .select('id, username, phone, avatar_url, email, dp_privacy, dp_selected_friends, hide_dp_in_search')
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
        return [];
    }

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

    const { getVisibleAvatar } = require('@/utils/privacyHelper');

    const finalSuggestions = registeredProfiles
        .filter(p => 
            !friendIds.has(p.id) && 
            !receivedRequestIds.has(p.id)
        )
        .map(p => ({
            ...p,
            avatar_url: getVisibleAvatar(p, currentUserId, false, true),
            requestStatus: sentRequestIds.has(p.id) ? 'pending' : null
        }));

    return finalSuggestions;
};
