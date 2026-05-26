import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export const useGroupSearch = (members: any[]) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const handleSearchFriends = async (query: string) => {
        setSearchQuery(query);
        if (query.trim().length < 2) { 
            setSearchResults([]); 
            return; 
        }
        setSearching(true);
        try {
            const { data } = await supabase
                .from('profiles')
                .select('id, username, avatar_url')
                .ilike('username', `%${query}%`)
                .limit(15);
            
            // Filter out existing members
            const existingIds = new Set(members.map(m => m.id));
            setSearchResults((data || []).filter(u => !existingIds.has(u.id)));
        } catch (e) {
            console.error('Search error:', e);
        } finally {
            setSearching(false);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
    };

    return {
        searchQuery,
        searchResults,
        searching,
        handleSearchFriends,
        clearSearch
    };
};
