import { useState, useEffect, useCallback } from 'react';
import * as Contacts from 'expo-contacts';
import { useAuthStore } from '@/store/useAuthStore';
import { Alert } from 'react-native';
import { getFromCache, saveToCache } from '@/lib/database';
import { syncDeviceContacts } from '@/services/contacts/contactSyncService';
import { sendContactFriendRequest, cancelContactFriendRequest } from '@/services/contacts/contactRequestService';

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
            const { status: existingStatus } = await Contacts.getPermissionsAsync();
            setPermissionGranted(existingStatus === 'granted');

            if (existingStatus !== 'granted') {
                setLoading(false);
                return;
            }

            const finalSuggestions = await syncDeviceContacts(currentUserId);
            
            if (finalSuggestions.length > 0 || (finalSuggestions.length === 0 && suggestions.length > 0)) {
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
            const senderProfile = useAuthStore.getState().profile;
            
            if (!senderProfile || !senderProfile.username) {
                Alert.alert('Profile Error', 'Your profile details are missing. Please update your profile in settings first.');
                return;
            }

            // Optimistic update UI
            setSuggestions(prev => prev.map(p => 
                p.id === receiverId ? { ...p, requestStatus: 'pending' } : p
            ));

            await sendContactFriendRequest(currentUserId, receiverId, senderProfile);

        } catch (error: any) {
            if (__DEV__) console.error("Overall sendRequest error:", error);
            // Revert optimistic update
            setSuggestions(prev => prev.map(p => 
                p.id === receiverId ? { ...p, requestStatus: null } : p
            ));
            
            if (error.message.includes("no longer exists")) {
                setSuggestions(prev => prev.filter(p => p.id !== receiverId));
            }
            Alert.alert('Error', 'Failed to send friend request. ' + error.message);
        }
    }, [currentUser, currentUserId]);

    const cancelRequest = useCallback(async (receiverId: string) => {
        if (!currentUserId || !currentUser) return;
        
        try {
            // Optimistic update UI
            setSuggestions(prev => prev.map(p => 
                p.id === receiverId ? { ...p, requestStatus: null } : p
            ));

            await cancelContactFriendRequest(currentUserId, receiverId);

            // Also remove from cache
            saveToCache('contact_suggestions', suggestions.map(p => 
                p.id === receiverId ? { ...p, requestStatus: null } : p
            ));
            
        } catch (error: any) {
            if (__DEV__) console.error("Overall cancelRequest error:", error);
            // Revert on error
            setSuggestions(prev => prev.map(p => 
                p.id === receiverId ? { ...p, requestStatus: 'pending' } : p
            ));
            Alert.alert('Error', 'Failed to cancel friend request. ' + error.message);
        }
    }, [currentUser, currentUserId, suggestions]);

    const requestPermission = useCallback(async () => {
        try {
            const { status } = await Contacts.requestPermissionsAsync();
            setPermissionGranted(status === 'granted');
            if (status === 'granted') {
                loadSuggestions(true);
            }
        } catch (error) {
            if (__DEV__) console.error("Error requesting contacts permission:", error);
        }
    }, [loadSuggestions]);

    return {
        suggestions,
        loading,
        permissionGranted,
        loadSuggestions,
        requestPermission,
        sendRequest,
        cancelRequest
    };
};
